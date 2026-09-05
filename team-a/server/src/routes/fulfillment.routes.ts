import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductCategory, QuotationStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { publish } from '../events/event-publisher';
import { SplitSuggestedPayload } from '../events/event-types';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

const acceptSplitSchema = z.object({
    splits: z.array(
        z.object({
            warehouseId: z.string().min(1),
            qtyFulfilled: z.number().int().positive(),
            shipmentCost: z.number().min(0).default(25),
        })
    ),
    isManualOverride: z.boolean().default(false),
});

// GET /api/fulfillment/:quotationId/suggest-split — calculate warehouse split based on stock
router.get(
    '/:quotationId/suggest-split',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: {
                    lines: {
                        include: { product: true },
                    },
                },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            // Only HARDWARE requires warehouse physical fulfillment
            const hardwareLines = quotation.lines.filter(
                (line) => line.product.category === ProductCategory.HARDWARE
            );

            if (hardwareLines.length === 0) {
                res.json({
                    message: 'Quotation has no physical hardware items requiring warehouse fulfillment',
                    splits: [],
                    generatedBy: 'core-rule',
                });
                return;
            }

            // Load all warehouses with stock
            const warehouses = await prisma.warehouse.findMany({
                include: { stock: true },
            });

            // Calculate optimal split per warehouse
            const warehouseAllocations = new Map<string, { warehouseName: string; qty: number; estCost: number }>();

            for (const line of hardwareLines) {
                let remainingQty = line.qty;

                // Sort warehouses with highest available stock for this product first
                const sortedWarehouses = [...warehouses].sort((a, b) => {
                    const stockA = a.stock.find((s) => s.productId === line.productId)?.qtyAvailable ?? 0;
                    const stockB = b.stock.find((s) => s.productId === line.productId)?.qtyAvailable ?? 0;
                    return stockB - stockA;
                });

                for (const wh of sortedWarehouses) {
                    if (remainingQty <= 0) break;
                    const stock = wh.stock.find((s) => s.productId === line.productId);
                    const available = stock ? stock.qtyAvailable : 0;

                    if (available > 0) {
                        const take = Math.min(remainingQty, available);
                        remainingQty -= take;

                        const current = warehouseAllocations.get(wh.id) ?? {
                            warehouseName: wh.name,
                            qty: 0,
                            estCost: 25.0, // baseline shipping per warehouse dispatch
                        };
                        current.qty += take;
                        warehouseAllocations.set(wh.id, current);
                    }
                }

                // If stock was exhausted across all warehouses, allocate remainder to Main Warehouse as backorder
                if (remainingQty > 0) {
                    const mainWh = warehouses[0];
                    const current = warehouseAllocations.get(mainWh.id) ?? {
                        warehouseName: mainWh.name,
                        qty: 0,
                        estCost: 25.0,
                    };
                    current.qty += remainingQty;
                    warehouseAllocations.set(mainWh.id, current);
                }
            }

            const splits = Array.from(warehouseAllocations.entries()).map(([warehouseId, alloc]) => ({
                warehouseId,
                warehouseName: alloc.warehouseName,
                qty: alloc.qty,
                estCost: alloc.estCost,
            }));

            // Publish ICD §3.5 SplitSuggested
            const payload: SplitSuggestedPayload = {
                eventVersion: 1,
                quotationId: quotation.id,
                splits,
                generatedBy: 'core-rule',
            };

            publish('SplitSuggested', payload);

            res.json({
                quotationId: quotation.id,
                splits,
                generatedBy: 'core-rule',
            });
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/fulfillment/:quotationId/splits — view existing accepted splits
router.get(
    '/:quotationId/splits',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const splits = await prisma.fulfillmentSplit.findMany({
                where: { quotationId: req.params.quotationId },
                include: { warehouse: true },
            });

            res.json({ data: splits });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/fulfillment/:quotationId/splits — accept suggested split or manual override
router.post(
    '/:quotationId/splits',
    authenticateStaff,
    validate(acceptSplitSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;
            const { splits, isManualOverride } = req.body;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { lines: true },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            if (quotation.status !== QuotationStatus.APPROVED && quotation.status !== QuotationStatus.DRAFT) {
                throw new BadRequestError(`Cannot fulfill quotation with status ${quotation.status}`);
            }

            // Execute transaction: save splits and update quotation status
            await prisma.$transaction(async (tx) => {
                await tx.fulfillmentSplit.deleteMany({ where: { quotationId } });

                for (const split of splits) {
                    await tx.fulfillmentSplit.create({
                        data: {
                            quotationId,
                            warehouseId: split.warehouseId,
                            qtyFulfilled: split.qtyFulfilled,
                            shipmentCost: split.shipmentCost,
                            generatedBy: isManualOverride ? 'manual-override' : 'core-rule',
                        },
                    });
                }

                await tx.quotation.update({
                    where: { id: quotationId },
                    data: { status: QuotationStatus.FULFILLED },
                });
            });

            const savedSplits = await prisma.fulfillmentSplit.findMany({
                where: { quotationId },
                include: { warehouse: true },
            });

            res.status(201).json({
                data: savedSplits,
                message: 'Fulfillment splits accepted and quotation marked FULFILLED',
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
