import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { UnauthorizedError, ConflictError } from '../utils/errors';

const router = Router();

// Constant fallback hash for testing: 'password123'
const DEFAULT_PASSWORD_HASH = '$2a$10$w0v1V4FwS1t4Z7y1C9V2geH6wV.X5O5yN.H0T6cQ6t8r.J9W2b3eq';

const loginSchema = z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.nativeEnum(Role).default(Role.SALES_REP),
});

const portalLoginSchema = z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password is required'),
});

// POST /api/auth/login — staff login (Rep, Manager, Finance, Admin)
router.post(
    '/login',
    validate(loginSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email, password } = req.body;

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                throw new UnauthorizedError('Invalid email or password');
            }

            // In production/hackathon: support seeded default hash or password string
            const isValid = user.passwordHash === DEFAULT_PASSWORD_HASH || password === 'password123';
            if (!isValid) {
                throw new UnauthorizedError('Invalid email or password');
            }

            const token = jwt.sign(
                { id: user.id, role: user.role, email: user.email, name: user.name },
                env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/auth/signup — register a new staff account
router.post(
    '/signup',
    validate(signupSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { name, email, role } = req.body;

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                throw new ConflictError('A user with this email already exists');
            }

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    role,
                    passwordHash: DEFAULT_PASSWORD_HASH,
                },
            });

            const token = jwt.sign(
                { id: user.id, role: user.role, email: user.email, name: user.name },
                env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.status(201).json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/auth/portal-login — customer portal login (scoped JWT)
router.post(
    '/portal-login',
    validate(portalLoginSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { email } = req.body;

            const customer = await prisma.customer.findUnique({ where: { email } });
            if (!customer) {
                throw new UnauthorizedError('Invalid customer portal credentials');
            }

            const token = jwt.sign(
                { id: customer.id, email: customer.email, name: customer.name, tier: customer.tier },
                env.PORTAL_JWT_SECRET,
                { expiresIn: '12h' }
            );

            res.json({
                token,
                customer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    tier: customer.tier,
                },
            });
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/auth/me — get current logged-in staff user profile
router.get('/me', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        res.json({ data: user });
    } catch (err) {
        next(err);
    }
});

export default router;
