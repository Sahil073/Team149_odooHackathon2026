import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

// Tier ceiling schema
const discountTierSchema = z.object({
    tierName: z.string().min(1, 'Tier name is required (e.g. Bronze, Silver, Gold)'),
    maxDiscountPct: z.number().int().min(0).max(100),
});

// Category ceiling schema
const categoryLimitSchema = z.object({
    category: z.nativeEnum(ProductCategory),
    maxDiscountPct: z.number().int().min(0).max(100),
});

// GET /api/discounts — get all tier discounts and category limits
router.get('/', authenticateStaff, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const [tiers, categories] = await Promise.all([
            prisma.discountTier.findMany({ orderBy: { maxDiscountPct: 'asc' } }),
            prisma.categoryDiscountLimit.findMany({ orderBy: { category: 'asc' } }),
        ]);

        res.json({
            data: {
                discountTiers: tiers,
                categoryLimits: categories,
            },
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/discounts/tiers — upsert a tier discount limit (Admin only)
router.post(
    '/tiers',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(discountTierSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { tierName, maxDiscountPct } = req.body;
            const tier = await prisma.discountTier.upsert({
                where: { tierName },
                update: { maxDiscountPct },
                create: { tierName, maxDiscountPct },
            });

            res.status(200).json({ data: tier, message: 'Discount tier saved successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/discounts/tiers/:id — delete tier (Admin only)
router.delete(
    '/tiers/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.discountTier.delete({ where: { id: req.params.id } });
            res.json({ message: 'Discount tier deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/discounts/categories — upsert category discount limit (Admin only)
router.post(
    '/categories',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(categoryLimitSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { category, maxDiscountPct } = req.body;
            const limit = await prisma.categoryDiscountLimit.upsert({
                where: { category },
                update: { maxDiscountPct },
                create: { category, maxDiscountPct },
            });

            res.status(200).json({ data: limit, message: 'Category discount limit saved successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/discounts/categories/:id — delete category limit (Admin only)
router.delete(
    '/categories/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.categoryDiscountLimit.delete({ where: { id: req.params.id } });
            res.json({ message: 'Category discount limit deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
