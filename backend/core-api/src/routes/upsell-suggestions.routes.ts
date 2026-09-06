import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { authenticateStaff } from '../middleware/auth.middleware';
import { calculateMarginDelta } from '../utils/calculations';
import { NotFoundError } from '../utils/errors';

const router = Router();

// GET /api/upsell-suggestions/:quotationId — Read contract ICD §4 with Fallback
router.get(
    '/:quotationId',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: { lines: true },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            const currentProductIds = quotation.lines.map((l: any) => l.productId);

            const matchingRules = await prisma.upsellRule.findMany({
                where: {
                    baseProductId: { in: currentProductIds },
                    // Do not suggest a product that is already in the cart
                    suggestedProductId: { notIn: currentProductIds },
                },
                include: {
                    suggestedProduct: true,
                },
                orderBy: [{ promoActive: 'desc' }, { minMarginPct: 'desc' }],
                take: 6,
            });

            // Attempt proxy to Team B Smart Layer ranking engine if configured
            if (env.SMART_LAYER_BASE_URL && matchingRules.length > 0) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), env.SMART_LAYER_TIMEOUT_MS);

                try {
                    const candidatesPayload = matchingRules.map((rule: any) => ({
                        productId: rule.suggestedProduct.id,
                        productName: rule.suggestedProduct.name,
                        basePrice: Number(rule.suggestedProduct.price),
                        marginPct: Number(rule.minMarginPct || 25),
                        isPromoted: Boolean(rule.promoActive),
                        coPurchaseScore: 0.75,
                    }));

                    const response = await fetch(`${env.SMART_LAYER_BASE_URL}/api/upsell-suggestions/compute`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            quotationId,
                            cartProductIds: currentProductIds,
                            candidates: candidatesPayload,
                            minMarginPct: 10,
                        }),
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
                    // Fallback to internal rules
                }
            }

            const currentCalculationLines = quotation.lines.map((l: any) => ({
                qty: l.qty,
                unitPrice: Number(l.unitPrice),
                discountPct: l.discountPct,
            }));

            const suggestions = matchingRules.map((rule: any, idx: number) => {
                const deltaResult = calculateMarginDelta(currentCalculationLines, {
                    qty: 1,
                    unitPrice: Number(rule.suggestedProduct.price),
                    discountPct: 0,
                    costPrice: Number(rule.suggestedProduct.price) * (1 - rule.minMarginPct / 100),
                });

                return {
                    productId: rule.suggestedProduct.id,
                    productName: rule.suggestedProduct.name,
                    category: rule.suggestedProduct.category,
                    price: Number(rule.suggestedProduct.price),
                    marginDelta: deltaResult.marginDelta,
                    promotionActive: rule.promoActive,
                    rank: idx + 1,
                };
            });

            res.json({
                quotationId,
                suggestions,
                fallbackActive: true,
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
