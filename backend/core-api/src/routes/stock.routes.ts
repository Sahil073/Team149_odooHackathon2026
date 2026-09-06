import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const setStockSchema = z.object({
    warehouseId: z.string().min(1, 'warehouseId is required'),
    productId: z.string().min(1, 'productId is required'),
    qtyAvailable: z.number().int().min(0, 'qtyAvailable must be >= 0'),
    qtyReserved: z.number().int().min(0, 'qtyReserved must be >= 0').default(0),
});

const adjustStockSchema = z.object({
    qtyAvailableDelta: z.number().int().optional(),
    qtyReservedDelta: z.number().int().optional(),
    setQtyAvailable: z.number().int().min(0).optional(),
    setQtyReserved: z.number().int().min(0).optional(),
});

// GET /api/stock — list all stock levels across warehouses
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { warehouseId, productId } = req.query;
        const where: Record<string, string> = {};
        if (warehouseId && typeof warehouseId === 'string') where.warehouseId = warehouseId;
        if (productId && typeof productId === 'string') where.productId = productId;

        const stock = await prisma.stock.findMany({
            where,
            include: {
                warehouse: { select: { id: true, name: true, location: true } },
                product: { select: { id: true, name: true, category: true, price: true, unit: true } },
            },
            orderBy: [{ warehouseId: 'asc' }, { productId: 'asc' }],
        });

        res.json({ data: stock });
    } catch (err) {
        next(err);
    }
});

// GET /api/stock/:warehouseId/:productId — get single stock record
router.get('/:warehouseId/:productId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { warehouseId, productId } = req.params;
        const stock = await prisma.stock.findUnique({
            where: {
                warehouseId_productId: { warehouseId, productId },
            },
            include: {
                warehouse: true,
                product: true,
            },
        });

        if (!stock) {
            throw new NotFoundError(`Stock not found for warehouse ${warehouseId} and product ${productId}`);
        }

        res.json({ data: stock });
    } catch (err) {
        next(err);
    }
});

// POST /api/stock — set or replenish stock (upsert)
router.post(
    '/',
    authenticateStaff,
    requireRole('ADMIN', 'FINANCE'),
    validate(setStockSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { warehouseId, productId, qtyAvailable, qtyReserved } = req.body;

            const stock = await prisma.stock.upsert({
                where: {
                    warehouseId_productId: { warehouseId, productId },
                },
                update: {
                    qtyAvailable,
                    qtyReserved,
                },
                create: {
                    warehouseId,
                    productId,
                    qtyAvailable,
                    qtyReserved,
                },
                include: {
                    warehouse: true,
                    product: true,
                },
            });

            res.status(200).json({ data: stock, message: 'Stock level updated successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/stock/:warehouseId/:productId — adjust stock (delta or direct set)
router.patch(
    '/:warehouseId/:productId',
    authenticateStaff,
    requireRole('ADMIN', 'FINANCE'),
    validate(adjustStockSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { warehouseId, productId } = req.params;
            const { qtyAvailableDelta, qtyReservedDelta, setQtyAvailable, setQtyReserved } = req.body;

            const current = await prisma.stock.findUnique({
                where: {
                    warehouseId_productId: { warehouseId, productId },
                },
            });

            if (!current) {
                throw new NotFoundError(`Stock not found for warehouse ${warehouseId} and product ${productId}`);
            }

            const newQtyAvailable = setQtyAvailable !== undefined
                ? setQtyAvailable
                : qtyAvailableDelta !== undefined
                    ? current.qtyAvailable + qtyAvailableDelta
                    : current.qtyAvailable;

            const newQtyReserved = setQtyReserved !== undefined
                ? setQtyReserved
                : qtyReservedDelta !== undefined
                    ? current.qtyReserved + qtyReservedDelta
                    : current.qtyReserved;

            if (newQtyAvailable < 0 || newQtyReserved < 0) {
                res.status(400).json({ error: 'Stock quantities cannot drop below 0' });
                return;
            }

            const updated = await prisma.stock.update({
                where: {
                    warehouseId_productId: { warehouseId, productId },
                },
                data: {
                    qtyAvailable: newQtyAvailable,
                    qtyReserved: newQtyReserved,
                },
                include: {
                    warehouse: true,
                    product: true,
                },
            });

            res.json({ data: updated, message: 'Stock adjusted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
