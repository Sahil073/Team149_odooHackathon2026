import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuotationStatus, QuotationLineStatus, ProductCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { publish } from '../events/event-publisher';
import { QuotationUpdatedPayload } from '../events/event-types';
import { calculateQuotationTotals } from '../utils/calculations';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

const createQuotationSchema = z.object({
    customerId: z.string().min(1, 'customerId is required'),
    lines: z
        .array(
            z.object({
                productId: z.string().min(1),
                qty: z.number().int().positive(),
                discountPct: z.number().int().min(0).max(100).default(0),
            })
        )
        .optional(),
});

const updateLinesSchema = z.object({
    lines: z.array(
        z.object({
            productId: z.string().min(1),
            qty: z.number().int().positive(),
            discountPct: z.number().int().min(0).max(100).default(0),
        })
    ),
});

// Helper to map Prisma category to Event Category shape
function toEventCategory(category: ProductCategory): 'Hardware' | 'Services' | 'Subscriptions' {
    switch (category) {
        case ProductCategory.HARDWARE:
            return 'Hardware';
        case ProductCategory.SERVICES:
            return 'Services';
        case ProductCategory.SUBSCRIPTIONS:
            return 'Subscriptions';
        default:
            return 'Hardware';
    }
}

// GET /api/quotations — list quotations (supports query filters)
router.get('/', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status, customerId, salesRepId } = req.query;
        const where: Record<string, unknown> = {};

        if (status && typeof status === 'string') {
            where.status = status as QuotationStatus;
        }
        if (customerId && typeof customerId === 'string') {
            where.customerId = customerId;
        }
        if (salesRepId && typeof salesRepId === 'string') {
            where.salesRepId = salesRepId;
        }

        const quotations = await prisma.quotation.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true, tier: true, email: true } },
                salesRep: { select: { id: true, name: true, email: true } },
                _count: { select: { lines: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        res.json({ data: quotations });
    } catch (err) {
        next(err);
    }
});

// GET /api/quotations/:id — full quotation details with lines and related status
router.get('/:id', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const quotation = await prisma.quotation.findUnique({
            where: { id: req.params.id },
            include: {
                customer: true,
                salesRep: { select: { id: true, name: true, email: true, role: true } },
                lines: {
                    include: {
                        product: true,
                    },
                },
                approvals: {
                    include: { reviewer: { select: { id: true, name: true, role: true } } },
                    orderBy: { timestamp: 'asc' },
                },
                splits: {
                    include: { warehouse: true },
                },
                subscription: {
                    include: { plan: true },
                },
                invoices: {
                    include: { payments: true },
                },
                healthFlags: true,
            },
        });

        if (!quotation) {
            throw new NotFoundError(`Quotation with id ${req.params.id} not found`);
        }

        const totals = calculateQuotationTotals(
            quotation.lines.map((l: any) => ({
                lineId: l.id,
                qty: l.qty,
                unitPrice: Number(l.unitPrice),
                discountPct: l.discountPct,
                taxPct: l.product.taxPct,
                categoryMaxDiscountPct: l.lineLimitPct,
            }))
        );

        res.json({ data: { ...quotation, totals } });
    } catch (err) {
        next(err);
    }
});

// POST /api/quotations — create a new quotation draft
router.post(
    '/',
    authenticateStaff,
    validate(createQuotationSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { customerId, lines } = req.body;
            const salesRepId = req.user!.id;

            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
            });
            if (!customer) {
                throw new NotFoundError(`Customer with id ${customerId} not found`);
            }

            // Create draft quotation
            const quotation = await prisma.quotation.create({
                data: {
                    customerId,
                    salesRepId,
                    status: QuotationStatus.DRAFT,
                },
            });

            // If initial lines provided, add them and emit QuotationUpdated
            if (lines && lines.length > 0) {
                const categoryLimits = await prisma.categoryDiscountLimit.findMany();
                const limitMap = new Map(categoryLimits.map((c: any) => [c.category, c.maxDiscountPct]));

                const createdLines = [];
                for (const line of lines) {
                    const product = await prisma.product.findUnique({ where: { id: line.productId } });
                    if (!product) continue;

                    const catLimit = limitMap.get(product.category) ?? 10;
                    const isFlagged = line.discountPct > catLimit;

                    const created = await prisma.quotationLine.create({
                        data: {
                            quotationId: quotation.id,
                            productId: line.productId,
                            qty: line.qty,
                            unitPrice: product.price,
                            discountPct: line.discountPct,
                            lineLimitPct: catLimit,
                            status: isFlagged ? QuotationLineStatus.FLAGGED : QuotationLineStatus.OK,
                        },
                        include: { product: true },
                    });
                    createdLines.push(created);
                }

                // Publish ICD §3.1 QuotationUpdated
                const payload: QuotationUpdatedPayload = {
                    eventVersion: 1,
                    quotationId: quotation.id,
                    customerId: customer.id,
                    customerTier: customer.tier === 'BRONZE' ? 'Bronze' : customer.tier === 'SILVER' ? 'Silver' : 'Gold',
                    salesRepId: quotation.salesRepId,
                    lines: createdLines.map((l) => ({
                        lineId: l.id,
                        productId: l.productId,
                        category: toEventCategory(l.product.category),
                        qty: l.qty,
                        unitPrice: Number(l.unitPrice),
                        discountPct: l.discountPct,
                        categoryMaxDiscountPct: l.lineLimitPct,
                    })),
                    timestamp: new Date().toISOString(),
                };

                publish('QuotationUpdated', payload);
            }

            const fullQuotation = await prisma.quotation.findUnique({
                where: { id: quotation.id },
                include: { lines: { include: { product: true } }, customer: true },
            });

            res.status(201).json({ data: fullQuotation, message: 'Quotation created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/quotations/:id/lines — update or replace lines and emit QuotationUpdated
router.patch(
    '/:id/lines',
    authenticateStaff,
    validate(updateLinesSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quotationId = req.params.id;
            const { lines } = req.body;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { customer: true },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            if (quotation.status === QuotationStatus.FULFILLED || quotation.status === QuotationStatus.CLOSED) {
                throw new BadRequestError('Cannot modify lines of a fulfilled or closed quotation');
            }

            // Remove old lines and re-create updated lines
            await prisma.quotationLine.deleteMany({ where: { quotationId } });

            const categoryLimits = await prisma.categoryDiscountLimit.findMany();
            const limitMap = new Map(categoryLimits.map((c: any) => [c.category, c.maxDiscountPct]));

            const newLines = [];
            for (const line of lines) {
                const product = await prisma.product.findUnique({ where: { id: line.productId } });
                if (!product) continue;

                const catLimit = limitMap.get(product.category) ?? 10;
                const isFlagged = line.discountPct > catLimit;

                const created = await prisma.quotationLine.create({
                    data: {
                        quotationId,
                        productId: line.productId,
                        qty: line.qty,
                        unitPrice: product.price,
                        discountPct: line.discountPct,
                        lineLimitPct: catLimit,
                        status: isFlagged ? QuotationLineStatus.FLAGGED : QuotationLineStatus.OK,
                    },
                    include: { product: true },
                });
                newLines.push(created);
            }

            // Publish ICD §3.1 QuotationUpdated
            const payload: QuotationUpdatedPayload = {
                eventVersion: 1,
                quotationId: quotation.id,
                customerId: quotation.customer.id,
                customerTier:
                    quotation.customer.tier === 'BRONZE' ? 'Bronze' : quotation.customer.tier === 'SILVER' ? 'Silver' : 'Gold',
                salesRepId: quotation.salesRepId,
                lines: newLines.map((l: any) => ({
                    lineId: l.id,
                    productId: l.productId,
                    category: toEventCategory(l.product.category),
                    qty: l.qty,
                    unitPrice: Number(l.unitPrice),
                    discountPct: l.discountPct,
                    categoryMaxDiscountPct: l.lineLimitPct,
                })),
                timestamp: new Date().toISOString(),
            };

            publish('QuotationUpdated', payload);

            const updatedQuotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { lines: { include: { product: true } } },
            });

            const totals = calculateQuotationTotals(
                (updatedQuotation?.lines ?? []).map((l: any) => ({
                    lineId: l.id,
                    qty: l.qty,
                    unitPrice: Number(l.unitPrice),
                    discountPct: l.discountPct,
                    taxPct: l.product.taxPct,
                    categoryMaxDiscountPct: l.lineLimitPct,
                }))
            );

            res.json({
                data: { ...updatedQuotation, totals },
                message: 'Quotation lines updated and event published',
            });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/quotations/:id — delete draft quotation
router.delete(
    '/:id',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id } });
            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${req.params.id} not found`);
            }

            if (quotation.status !== QuotationStatus.DRAFT) {
                throw new BadRequestError('Only draft quotations can be deleted');
            }

            await prisma.quotation.delete({ where: { id: req.params.id } });
            res.json({ message: 'Draft quotation deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
