import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const warehouseSchema = z.object({
    name: z.string().min(1, 'Warehouse name is required'),
    location: z.string().min(1, 'Warehouse location is required'),
});

const updateWarehouseSchema = warehouseSchema.partial();

// GET /api/warehouses — list all warehouses with stock summary
router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: {
                _count: { select: { stock: true } },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ data: warehouses });
    } catch (err) {
        next(err);
    }
});

// GET /api/warehouses/:id — get warehouse with detailed stock levels
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const warehouse = await prisma.warehouse.findUnique({
            where: { id: req.params.id },
            include: {
                stock: {
                    include: {
                        product: {
                            select: { id: true, name: true, category: true, price: true, unit: true },
                        },
                    },
                },
            },
        });

        if (!warehouse) {
            throw new NotFoundError(`Warehouse with id ${req.params.id} not found`);
        }

        res.json({ data: warehouse });
    } catch (err) {
        next(err);
    }
});

// POST /api/warehouses — create warehouse (Admin or Operations)
router.post(
    '/',
    authenticateStaff,
    requireRole('ADMIN', 'FINANCE'),
    validate(warehouseSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const warehouse = await prisma.warehouse.create({
                data: req.body,
            });

            res.status(201).json({ data: warehouse, message: 'Warehouse created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/warehouses/:id — update warehouse
router.patch(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN', 'FINANCE'),
    validate(updateWarehouseSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const updated = await prisma.warehouse.update({
                where: { id: req.params.id },
                data: req.body,
            });

            res.json({ data: updated, message: 'Warehouse updated successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/warehouses/:id — delete warehouse
router.delete(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.warehouse.delete({
                where: { id: req.params.id },
            });

            res.json({ message: 'Warehouse deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
