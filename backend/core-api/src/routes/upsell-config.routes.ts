import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const upsellRuleSchema = z.object({
    baseProductId: z.string().min(1),
    suggestedProductId: z.string().min(1),
    minMarginPct: z.number().int().min(0).max(100).default(20),
    promoActive: z.boolean().default(false),
});

const updateUpsellRuleSchema = upsellRuleSchema.partial();

// GET /api/upsell-rules — list upsell configuration rules
router.get('/', authenticateStaff, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rules = await prisma.upsellRule.findMany({
            include: {
                baseProduct: { select: { id: true, name: true, category: true, price: true } },
                suggestedProduct: { select: { id: true, name: true, category: true, price: true } },
            },
            orderBy: { promoActive: 'desc' },
        });

        res.json({ data: rules });
    } catch (err) {
        next(err);
    }
});

// POST /api/upsell-rules — create/upsert upsell pairing rule (Admin only)
router.post(
    '/',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(upsellRuleSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { baseProductId, suggestedProductId, minMarginPct, promoActive } = req.body;

            const rule = await prisma.upsellRule.upsert({
                where: {
                    baseProductId_suggestedProductId: { baseProductId, suggestedProductId },
                },
                update: { minMarginPct, promoActive },
                create: { baseProductId, suggestedProductId, minMarginPct, promoActive },
                include: { baseProduct: true, suggestedProduct: true },
            });

            res.status(200).json({ data: rule, message: 'Upsell rule configured successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/upsell-rules/:id — update upsell rule
router.patch(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(updateUpsellRuleSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const updated = await prisma.upsellRule.update({
                where: { id: req.params.id },
                data: req.body,
            });

            res.json({ data: updated, message: 'Upsell rule updated' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/upsell-rules/:id — delete upsell rule
router.delete(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.upsellRule.delete({ where: { id: req.params.id } });
            res.json({ message: 'Upsell rule deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
