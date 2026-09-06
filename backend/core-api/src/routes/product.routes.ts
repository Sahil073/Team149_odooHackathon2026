import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductCategory } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const DEMO_PRODUCTS = [
    { id: 'prod-1', name: 'Laptop Pro 14', category: 'HARDWARE', price: 1140, unit: 'unit', taxPct: 18, variants: [], stock: [] },
    { id: 'prod-2', name: 'Docking Station USB-C', category: 'HARDWARE', price: 180, unit: 'unit', taxPct: 18, variants: [], stock: [] },
    { id: 'prod-3', name: 'Enterprise Setup & Deployment', category: 'SERVICES', price: 450, unit: 'session', taxPct: 18, variants: [], stock: [] },
    { id: 'prod-4', name: 'Priority Care Plan 2-Year', category: 'SUBSCRIPTIONS', price: 46, unit: 'month', taxPct: 18, variants: [], stock: [] },
];

const createProductSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    category: z.nativeEnum(ProductCategory),
    price: z.number().positive('Price must be greater than 0'),
    unit: z.string().default('unit'),
    taxPct: z.number().int().min(0).max(100).default(18),
    description: z.string().optional(),
    variants: z
        .array(
            z.object({
                attribute: z.string().min(1),
                value: z.string().min(1),
                extraPrice: z.number().default(0),
            })
        )
        .optional(),
});

const updateProductSchema = createProductSchema.partial();

const addVariantSchema = z.object({
    attribute: z.string().min(1, 'Attribute name is required (e.g. Size, Storage)'),
    value: z.string().min(1, 'Attribute value is required (e.g. 32GB, 2TB)'),
    extraPrice: z.number().default(0),
});

// GET /api/products — list products (filter by category if provided)
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isDatabaseConnected) {
        res.json({ data: DEMO_PRODUCTS });
        return;
    }

    try {
        const { category } = req.query;
        const where = category && Object.values(ProductCategory).includes(category as ProductCategory)
            ? { category: category as ProductCategory }
            : undefined;

        const products = await prisma.product.findMany({
            where,
            include: {
                variants: true,
                stock: {
                    include: {
                        warehouse: { select: { id: true, name: true, location: true } },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ data: products });
    } catch (err: any) {
        res.json({ data: DEMO_PRODUCTS });
    }
});

// GET /api/products/:id — get product by id with variants and stock
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: {
                variants: true,
                stock: {
                    include: {
                        warehouse: { select: { id: true, name: true, location: true } },
                    },
                },
                upsellAsBase: {
                    include: { suggestedProduct: true },
                },
            },
        });

        if (!product) {
            throw new NotFoundError(`Product with id ${req.params.id} not found`);
        }

        res.json({ data: product });
    } catch (err) {
        next(err);
    }
});

// POST /api/products — create product
router.post(
    '/',
    authenticateStaff,
    validate(createProductSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { variants, ...productData } = req.body;

            const product = await prisma.product.create({
                data: {
                    ...productData,
                    variants: variants && variants.length > 0
                        ? {
                            create: variants.map((v: { attribute: string; value: string; extraPrice?: number }) => ({
                                attribute: v.attribute,
                                value: v.value,
                                extraPrice: v.extraPrice ?? 0,
                            })),
                        }
                        : undefined,
                },
                include: { variants: true },
            });

            res.status(201).json({ data: product, message: 'Product created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/products/:id — update product
router.patch(
    '/:id',
    authenticateStaff,
    validate(updateProductSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { variants: _variants, ...updateData } = req.body;

            const updated = await prisma.product.update({
                where: { id: req.params.id },
                data: updateData,
                include: { variants: true },
            });

            res.json({ data: updated, message: 'Product updated successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/products/:id — delete product
router.delete(
    '/:id',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.product.delete({
                where: { id: req.params.id },
            });

            res.json({ message: 'Product deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/products/:id/variants — add a variant to an existing product
router.post(
    '/:id/variants',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(addVariantSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const variant = await prisma.productVariant.create({
                data: {
                    productId: req.params.id,
                    attribute: req.body.attribute,
                    value: req.body.value,
                    extraPrice: req.body.extraPrice ?? 0,
                },
            });

            res.status(201).json({ data: variant, message: 'Variant added successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/products/:id/variants/:variantId — remove a product variant
router.delete(
    '/:id/variants/:variantId',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.productVariant.delete({
                where: { id: req.params.variantId },
            });

            res.json({ message: 'Variant deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
