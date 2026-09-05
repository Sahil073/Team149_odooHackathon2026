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

            // Attempt proxy to Team B if endpoint configured
            if (env.SMART_LAYER_BASE_URL) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), env.SMART_LAYER_TIMEOUT_MS);

                try {
                    const response = await fetch(`${env.SMART_LAYER_BASE_URL}/upsell-suggestions/${quotationId}`, {
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

            // Internal fallback: Look up configured UpsellRules for products in this quotation
            const currentProductIds = quotation.lines.map((l) => l.productId);

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
                take: 5,
            });

            const currentCalculationLines = quotation.lines.map((l) => ({
                qty: l.qty,
                unitPrice: Number(l.unitPrice),
                discountPct: l.discountPct,
            }));

            const suggestions = matchingRules.map((rule, idx) => {
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
