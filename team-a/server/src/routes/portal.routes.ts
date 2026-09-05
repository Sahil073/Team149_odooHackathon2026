import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuotationStatus, QuotationLineStatus, ProductCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticatePortal } from '../middleware/auth.middleware';
import { publish } from '../events/event-publisher';
import { NegotiationSubmittedPayload, QuotationUpdatedPayload } from '../events/event-types';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

const counterNegotiationSchema = z.object({
    requestedChanges: z.array(
        z.object({
            lineId: z.string().min(1),
            newDiscountPct: z.number().int().min(0).max(100),
        })
    ),
    notes: z.string().optional(),
});

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

// GET /api/portal/quotations/:id — customer view of quotation
router.get(
    '/quotations/:id',
    authenticatePortal,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quotation = await prisma.quotation.findUnique({
                where: { id: req.params.id },
                include: {
                    customer: { select: { id: true, name: true, tier: true, email: true } },
                    lines: {
                        include: {
                            product: { select: { id: true, name: true, category: true, price: true, unit: true } },
                        },
                    },
                },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${req.params.id} not found`);
            }

            // Ensure the portal customer owns this quotation
            if (req.customer && quotation.customerId !== req.customer.id) {
                res.status(403).json({ error: 'You are not authorized to view this quotation' });
                return;
            }

            res.json({ data: quotation });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/portal/quotations/:id/negotiate — counter discount proposal from customer
router.post(
    '/quotations/:id/negotiate',
    authenticatePortal,
    validate(counterNegotiationSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quotationId = req.params.id;
            const { requestedChanges } = req.body;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { customer: true, lines: { include: { product: true } } },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            // 1. Publish ICD §3.7 NegotiationSubmitted
            const negotiationPayload: NegotiationSubmittedPayload = {
                eventVersion: 1,
                quotationId: quotation.id,
                customerId: quotation.customerId,
                requestedChanges,
                submittedAt: new Date().toISOString(),
            };
            publish('NegotiationSubmitted', negotiationPayload);

            // 2. Apply requested changes to the quotation lines
            const categoryLimits = await prisma.categoryDiscountLimit.findMany();
            const limitMap = new Map(categoryLimits.map((c) => [c.category, c.maxDiscountPct]));

            for (const change of requestedChanges) {
                const line = quotation.lines.find((l) => l.id === change.lineId);
                if (!line) continue;

                const catLimit = limitMap.get(line.product.category) ?? 10;
                const isFlagged = change.newDiscountPct > catLimit;

                await prisma.quotationLine.update({
                    where: { id: change.lineId },
                    data: {
                        discountPct: change.newDiscountPct,
                        status: isFlagged ? QuotationLineStatus.FLAGGED : QuotationLineStatus.OK,
                    },
                });
            }

            // Mark quotation as PENDING_APPROVAL since customer modified terms
            await prisma.quotation.update({
                where: { id: quotationId },
                data: { status: QuotationStatus.PENDING_APPROVAL },
            });

            // 3. Re-trigger QuotationUpdated per ICD §3.7 to restart risk scoring & approval pipeline
            const refreshedLines = await prisma.quotationLine.findMany({
                where: { quotationId },
                include: { product: true },
            });

            const quotationUpdatedPayload: QuotationUpdatedPayload = {
                eventVersion: 1,
                quotationId: quotation.id,
                customerId: quotation.customer.id,
                customerTier:
                    quotation.customer.tier === 'BRONZE' ? 'Bronze' : quotation.customer.tier === 'SILVER' ? 'Silver' : 'Gold',
                salesRepId: quotation.salesRepId,
                lines: refreshedLines.map((l) => ({
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

            publish('QuotationUpdated', quotationUpdatedPayload);

            res.json({
                message: 'Counter discount submitted. Quotation has re-entered the approval pipeline.',
                status: QuotationStatus.PENDING_APPROVAL,
            });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/portal/quotations/:id/confirm — customer confirms quotation terms
router.post(
    '/quotations/:id/confirm',
    authenticatePortal,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const quotationId = req.params.id;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { lines: true },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            // Check if any line has unapproved breach
            const hasBreach = quotation.lines.some((l) => l.status === QuotationLineStatus.FLAGGED);

            if (hasBreach) {
                // If final terms exceed thresholds, automatically re-enter approval flow
                await prisma.quotation.update({
                    where: { id: quotationId },
                    data: { status: QuotationStatus.PENDING_APPROVAL },
                });

                res.json({
                    message: 'Quotation confirmed but contains discount exceptions. Sent for manager approval.',
                    status: QuotationStatus.PENDING_APPROVAL,
                });
                return;
            }

            // If clean, approve quotation
            await prisma.quotation.update({
                where: { id: quotationId },
                data: { status: QuotationStatus.APPROVED },
            });

            res.json({
                message: 'Quotation confirmed! Order is now ready for fulfillment and invoicing.',
                status: QuotationStatus.APPROVED,
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
