import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { authenticateStaff } from '../middleware/auth.middleware';

const router = Router();

interface WinPredictRequestBody {
    customerTier?: string;
    totalRevenue?: number;
    avgDiscountPct?: number;
    itemCount?: number;
    riskScore?: number;
    amount?: number;
    discount_pct?: number;
}

// Fallback computation matching ML model weights if Smart Layer is offline
function computeFallbackWinProbability(body: WinPredictRequestBody) {
    const tier = body.customerTier || 'Silver';
    const revenue = body.totalRevenue ?? body.amount ?? 10000;
    const discount = body.avgDiscountPct ?? body.discount_pct ?? 5.0;
    const items = body.itemCount ?? 1;
    const risk = body.riskScore ?? 0.15;

    const tierScore = tier === 'Gold' ? 0.35 : tier === 'Silver' ? 0.10 : -0.25;
    const discountScore = discount <= 12 ? (discount / 12) * 0.25 : 0.25 - ((discount - 12) / 10) * 0.35;
    const revenueScore = revenue > 30000 ? -0.15 : revenue < 2000 ? 0.05 : 0.0;
    const bundleScore = Math.min(items, 5) * 0.03;
    const riskScorePenalty = risk * -0.4;

    const logit = 0.2 + tierScore + discountScore + revenueScore + bundleScore + riskScorePenalty;
    const prob = Math.min(Math.max(1 / (1 + Math.exp(-logit * 3)), 0.05), 0.98);

    const status = prob >= 0.70 ? 'HIGH' : prob >= 0.45 ? 'MODERATE' : 'AT_RISK';
    let keyDriver = '';
    if (prob >= 0.70) {
        keyDriver = `Strong win propensity for ${tier} tier customer with healthy ${discount.toFixed(1)}% discount.`;
    } else if (prob >= 0.45) {
        keyDriver = `Moderate close rate. Deal size ($${revenue.toLocaleString()}) requires follow-up.`;
    } else {
        keyDriver = `High attrition risk: excessive discount (${discount.toFixed(1)}%) or high deal friction flagged.`;
    }

    const recommendedDiscountPct = tier === 'Gold' ? 12 : tier === 'Silver' ? 8 : 5;

    return {
        winProbability: Math.round(prob * 100) / 100,
        status,
        confidence: 0.85,
        keyDriver,
        recommendedDiscountPct,
        fallbackActive: true,
        computedAt: new Date().toISOString(),
    };
}

// POST /api/ai/win-probability
router.post(
    '/win-probability',
    async (req: Request<{}, {}, WinPredictRequestBody>, res: Response, next: NextFunction): Promise<void> => {
        try {
            const smartLayerUrl = env.SMART_LAYER_BASE_URL || 'http://localhost:8000';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), env.SMART_LAYER_TIMEOUT_MS || 2500);

            try {
                const response = await fetch(`${smartLayerUrl}/api/ai/win-probability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req.body),
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
                // Fall through to internal fail-safe fallback
            }

            // ICD §5 Fallback Contract: Return deterministic fail-safe response if smart layer is unreachable
            const fallbackResult = computeFallbackWinProbability(req.body);
            res.json(fallbackResult);
        } catch (err) {
            next(err);
        }
    }
);

export default router;

