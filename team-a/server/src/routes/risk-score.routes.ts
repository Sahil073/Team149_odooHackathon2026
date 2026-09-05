import { Router, Request, Response, NextFunction } from 'express';
import { QuotationLineStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { authenticateStaff } from '../middleware/auth.middleware';
import { subscribe } from '../events/event-subscriber';
import { calculateBlendedRisk } from '../utils/calculations';
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

            // ICD §5 Fallback: Calculate blended risk engine math internally (fail-safe)
            const riskAssessment = calculateBlendedRisk(
                quotation.lines.map((l) => ({
                    lineId: l.id,
                    qty: l.qty,
                    unitPrice: Number(l.unitPrice),
                    discountPct: l.discountPct,
                    categoryMaxDiscountPct: l.lineLimitPct,
                }))
            );

            res.json({
                eventVersion: 1,
                quotationId: quotation.id,
                blendedRiskScore: quotation.blendedRiskScore ?? riskAssessment.blendedRiskScore,
                requiresApproval: riskAssessment.requiresApproval,
                requiresFinance: riskAssessment.requiresFinance,
                flaggedLines: riskAssessment.flaggedLineIds,
                reason: riskAssessment.reasons.length > 0 ? riskAssessment.reasons.join('; ') : 'Within standard limits',
                fallbackActive: true,
                computedAt: new Date().toISOString(),
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
