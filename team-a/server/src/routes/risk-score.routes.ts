import { Router, Request, Response, NextFunction } from 'express';
import { QuotationLineStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { authenticateStaff } from '../middleware/auth.middleware';
import { subscribe } from '../events/event-subscriber';
import { NotFoundError } from '../utils/errors';

const router = Router();

// Listen to Team B's RiskScoreComputed event per ICD §3.2 and store on Quotation
subscribe('RiskScoreComputed', async (payload) => {
    try {
        await prisma.quotation.update({
            where: { id: payload.quotationId },
            data: { blendedRiskScore: payload.blendedRiskScore },
        });
    } catch (err) {
        console.error('Failed to update blendedRiskScore on Quotation:', err);
    }
});

// GET /api/risk-score/:quotationId — Read contract ICD §4 with ICD §5 Fallback
router.get(
    '/:quotationId',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: {
                    lines: { include: { product: true } },
                    customer: true,
                },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            // If Team B endpoint configured, attempt proxy with timeout
            if (env.SMART_LAYER_BASE_URL) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), env.SMART_LAYER_TIMEOUT_MS);

                try {
                    const response = await fetch(`${env.SMART_LAYER_BASE_URL}/risk-score/${quotationId}`, {
                        signal: controller.signal,
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        res.json(data);
                        return;
                    }
                } catch {
                    clearTimeout(timeoutId);
                    // Fall through to ICD §5 Fallback Contract
                }
            }

            // ICD §5 Fallback: Calculate baseline risk internally (fail-safe)
            const flaggedLines = quotation.lines
                .filter((l) => l.status === QuotationLineStatus.FLAGGED || l.discountPct > l.lineLimitPct)
                .map((l) => l.id);

            const maxDiscountGiven = Math.max(0, ...quotation.lines.map((l) => l.discountPct));
            const requiresApproval = flaggedLines.length > 0 || maxDiscountGiven > 5;
            const requiresFinance = maxDiscountGiven > 15;

            res.json({
                eventVersion: 1,
                quotationId: quotation.id,
                blendedRiskScore: quotation.blendedRiskScore ?? (flaggedLines.length > 0 ? 0.75 : 0.1),
                requiresApproval,
                requiresFinance,
                flaggedLines,
                reason:
                    flaggedLines.length > 0
                        ? `${flaggedLines.length} line(s) exceed discount limits`
                        : 'Within standard discount thresholds',
                fallbackActive: true,
                computedAt: new Date().toISOString(),
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
