import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomerTier } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const priceListSchema = z.object({
    customerTier: z.nativeEnum(CustomerTier),
    currency: z.string().min(1).default('USD'),
    priceRule: z.string().min(1, 'Price rule description or formula is required'),
});

const updatePriceListSchema = priceListSchema.partial();

// GET /api/pricing — list price lists
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { tier } = req.query;
        const where = tier && Object.values(CustomerTier).includes(tier as CustomerTier)
            ? { customerTier: tier as CustomerTier }
            : undefined;

        const priceLists = await prisma.priceList.findMany({
            where,
            orderBy: { customerTier: 'asc' },
        });

        res.json({ data: priceLists });
    } catch (err) {
        next(err);
    }
});

// GET /api/pricing/:id — get price list by id
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const priceList = await prisma.priceList.findUnique({
            where: { id: req.params.id },
        });

        if (!priceList) {
            throw new NotFoundError(`Price list with id ${req.params.id} not found`);
        }

        res.json({ data: priceList });
    } catch (err) {
        next(err);
    }
});

// POST /api/pricing — create price list rule (Admin only)
router.post(
    '/',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(priceListSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const priceList = await prisma.priceList.create({
                data: req.body,
            });

            res.status(201).json({ data: priceList, message: 'Price list created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/pricing/:id — update price list (Admin only)
router.patch(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(updatePriceListSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const updated = await prisma.priceList.update({
                where: { id: req.params.id },
                data: req.body,
            });

            res.json({ data: updated, message: 'Price list updated successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/pricing/:id — delete price list (Admin only)
router.delete(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.priceList.delete({
                where: { id: req.params.id },
            });

            res.json({ message: 'Price list deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
