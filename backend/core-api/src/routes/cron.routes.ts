import { Router, Request, Response, NextFunction } from 'express';
import { DealHealthFlagType, DealHealthSeverity, QuotationStatus } from '@prisma/client';
import { prisma } from '../config/database';

const router = Router();

// POST /api/cron/deal-health-scan — scan and flag stalled or anomalous quotations
router.post('/deal-health-scan', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. Detect Stalled Deals
        const stalledQuotations = await prisma.quotation.findMany({
            where: {
                status: { in: [QuotationStatus.DRAFT, QuotationStatus.PENDING_APPROVAL] },
                updatedAt: { lt: sevenDaysAgo },
            },
            include: { lines: true },
        });

        let flaggedCount = 0;
        for (const quote of stalledQuotations) {
            const existingFlag = await prisma.dealHealthFlag.findFirst({
                where: {
                    quotationId: quote.id,
                    flagType: DealHealthFlagType.STALLED,
                    resolved: false,
                },
            });

            if (!existingFlag) {
                await prisma.dealHealthFlag.create({
                    data: {
                        quotationId: quote.id,
                        flagType: DealHealthFlagType.STALLED,
                        severity: DealHealthSeverity.MEDIUM,
                        detail: `Deal inactive for over 7 days in ${quote.status} stage`,
                        resolved: false,
                    },
                });
                flaggedCount++;
            }
        }

        // 2. Detect High Discount Anomalies (> 20% discount on any line)
        const anomalyQuotations = await prisma.quotation.findMany({
            where: {
                lines: { some: { discountPct: { gte: 20 } } },
            },
            include: { lines: true },
        });

        for (const quote of anomalyQuotations) {
            const existingAnomaly = await prisma.dealHealthFlag.findFirst({
                where: {
                    quotationId: quote.id,
                    flagType: DealHealthFlagType.DISCOUNT_ANOMALY,
                    resolved: false,
                },
            });

            if (!existingAnomaly) {
                const highestDiscount = Math.max(...quote.lines.map((l: any) => l.discountPct));
                await prisma.dealHealthFlag.create({
                    data: {
                        quotationId: quote.id,
                        flagType: DealHealthFlagType.DISCOUNT_ANOMALY,
                        severity: DealHealthSeverity.HIGH,
                        detail: `Line discount of ${highestDiscount}% significantly exceeds normal pricing envelope`,
                        resolved: false,
                    },
                });
                flaggedCount++;
            }
        }

        res.json({
            message: 'Deal health scan completed successfully',
            newFlagsCreated: flaggedCount,
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/cron/seed — reseed initial database data
router.post('/seed', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { seed } = await import('../database/seeds/seed');
        await seed();
        res.json({ message: 'Database seeded successfully' });
    } catch (err) {
        next(err);
    }
});

export default router;

