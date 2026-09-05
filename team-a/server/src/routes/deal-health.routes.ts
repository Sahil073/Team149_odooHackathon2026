import { Router, Request, Response, NextFunction } from 'express';
import { DealHealthSeverity, DealHealthFlagType } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { subscribe } from '../events/event-subscriber';
import { NotFoundError } from '../utils/errors';

const router = Router();

// Listen to Team B's DealHealthFlagRaised event per ICD §3.8
subscribe('DealHealthFlagRaised', async (payload) => {
    try {
        let flagType: DealHealthFlagType = DealHealthFlagType.STALLED;
        if (payload.flagType === 'discount_anomaly') flagType = DealHealthFlagType.DISCOUNT_ANOMALY;
        if (payload.flagType === 'delivery_slippage') flagType = DealHealthFlagType.DELIVERY_SLIPPAGE;

        let severity: DealHealthSeverity = DealHealthSeverity.LOW;
        if (payload.severity === 'medium') severity = DealHealthSeverity.MEDIUM;
        if (payload.severity === 'high') severity = DealHealthSeverity.HIGH;

        await prisma.dealHealthFlag.create({
            data: {
                quotationId: payload.quotationId,
                flagType,
                severity,
                detail: payload.detail,
                detectedAt: new Date(payload.detectedAt),
                resolved: false,
            },
        });
    } catch (err) {
        console.error('Failed to store DealHealthFlag from event:', err);
    }
});

// GET /api/deal-health-flags — list flags (filterable by severity & resolution)
router.get(
    '/',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { severity, resolved } = req.query;
            const where: Record<string, unknown> = {};

            if (severity && Object.values(DealHealthSeverity).includes(severity as DealHealthSeverity)) {
                where.severity = severity as DealHealthSeverity;
            }

            if (resolved !== undefined) {
                where.resolved = resolved === 'true';
            }

            const flags = await prisma.dealHealthFlag.findMany({
                where,
                include: {
                    quotation: {
                        include: {
                            customer: { select: { id: true, name: true, tier: true } },
                            salesRep: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
                orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
            });

            res.json({ data: flags });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/deal-health-flags/scan — trigger immediate deal health scan
router.post(
    '/scan',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'ADMIN'),
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const stalled = await prisma.quotation.findMany({
                where: {
                    status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
                    updatedAt: { lt: sevenDaysAgo },
                },
            });

            for (const q of stalled) {
                const exists = await prisma.dealHealthFlag.findFirst({
                    where: { quotationId: q.id, flagType: DealHealthFlagType.STALLED, resolved: false },
                });
                if (!exists) {
                    await prisma.dealHealthFlag.create({
                        data: {
                            quotationId: q.id,
                            flagType: DealHealthFlagType.STALLED,
                            severity: DealHealthSeverity.MEDIUM,
                            detail: `Quotation inactive for >7 days in ${q.status} state`,
                            resolved: false,
                        },
                    });
                }
            }

            const anomalyQuotes = await prisma.quotation.findMany({
                where: { lines: { some: { discountPct: { gte: 20 } } } },
            });
            for (const q of anomalyQuotes) {
                const exists = await prisma.dealHealthFlag.findFirst({
                    where: { quotationId: q.id, flagType: DealHealthFlagType.DISCOUNT_ANOMALY, resolved: false },
                });
                if (!exists) {
                    await prisma.dealHealthFlag.create({
                        data: {
                            quotationId: q.id,
                            flagType: DealHealthFlagType.DISCOUNT_ANOMALY,
                            severity: DealHealthSeverity.HIGH,
                            detail: `Line discount exceeds 20% threshold`,
                            resolved: false,
                        },
                    });
                }
            }

            const updatedFlags = await prisma.dealHealthFlag.findMany({
                where: { resolved: false },
                include: {
                    quotation: {
                        include: {
                            customer: { select: { id: true, name: true, tier: true } },
                            salesRep: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
                orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
            });

            res.json({ message: 'Deal health scan completed', data: updatedFlags });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/deal-health-flags/:id/resolve — resolve an anomaly flag
router.patch(
    '/:id/resolve',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const flag = await prisma.dealHealthFlag.findUnique({ where: { id: req.params.id } });
            if (!flag) {
                throw new NotFoundError(`Deal health flag with id ${req.params.id} not found`);
            }

            const updated = await prisma.dealHealthFlag.update({
                where: { id: req.params.id },
                data: { resolved: true },
            });

            res.json({ data: updated, message: 'Deal health alert resolved' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
