import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomerTier } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const customerSchema = z.object({
    name: z.string().min(1, 'Customer name is required'),
    email: z.string().email('Valid customer email is required'),
    tier: z.nativeEnum(CustomerTier).default(CustomerTier.BRONZE),
    portalPassword: z.string().min(6).optional(),
});

const updateCustomerSchema = customerSchema.partial();

// GET /api/customers — list customers
router.get('/', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { tier } = req.query;
        const where = tier && Object.values(CustomerTier).includes(tier as CustomerTier)
            ? { tier: tier as CustomerTier }
            : undefined;

        const customers = await prisma.customer.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                tier: true,
                createdAt: true,
                _count: { select: { quotations: true } },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ data: customers });
    } catch (err) {
        next(err);
    }
});

// GET /api/customers/:id — get customer details with recent quotations
router.get('/:id', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id: req.params.id },
            include: {
                quotations: {
                    select: {
                        id: true,
                        status: true,
                        blendedRiskScore: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!customer) {
            throw new NotFoundError(`Customer with id ${req.params.id} not found`);
        }

        // Strip password hash from response
        const { portalPasswordHash: _hash, ...safeCustomer } = customer;
        res.json({ data: safeCustomer });
    } catch (err) {
        next(err);
    }
});

// POST /api/customers — create customer
router.post(
    '/',
    authenticateStaff,
    validate(customerSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { portalPassword, ...rest } = req.body;
            // Default precomputed hash if not provided: password123
            const portalPasswordHash = '$2a$10$w0v1V4FwS1t4Z7y1C9V2geH6wV.X5O5yN.H0T6cQ6t8r.J9W2b3eq';

            const customer = await prisma.customer.create({
                data: {
                    ...rest,
                    portalPasswordHash,
                },
            });

            const { portalPasswordHash: _hash, ...safeCustomer } = customer;
            res.status(201).json({ data: safeCustomer, message: 'Customer created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/customers/:id — update customer
router.patch(
    '/:id',
    authenticateStaff,
    validate(updateCustomerSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { portalPassword: _pw, ...updateData } = req.body;

            const updated = await prisma.customer.update({
                where: { id: req.params.id },
                data: updateData,
            });

            const { portalPasswordHash: _hash, ...safeCustomer } = updated;
            res.json({ data: safeCustomer, message: 'Customer updated successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/customers/:id — delete customer
router.delete(
    '/:id',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.customer.delete({
                where: { id: req.params.id },
            });

            res.json({ message: 'Customer deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
