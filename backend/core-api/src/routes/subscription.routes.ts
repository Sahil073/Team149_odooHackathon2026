import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SubscriptionCycle, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

const planSchema = z.object({
    name: z.string().min(1, 'Plan name is required'),
    cycle: z.nativeEnum(SubscriptionCycle),
    prorationRule: z.string().default('calendar_days'),
});

const attachSubscriptionSchema = z.object({
    quotationId: z.string().min(1, 'quotationId is required'),
    planId: z.string().min(1, 'planId is required'),
});

const updateStatusSchema = z.object({
    status: z.nativeEnum(SubscriptionStatus),
});

// GET /api/subscriptions/plans — list all subscription plans
router.get('/plans', authenticateStaff, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { name: 'asc' },
        });

        res.json({ data: plans });
    } catch (err) {
        next(err);
    }
});

// POST /api/subscriptions/plans — create a subscription plan
router.post(
    '/plans',
    authenticateStaff,
    validate(planSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const plan = await prisma.subscriptionPlan.create({
                data: req.body,
            });

            res.status(201).json({ data: plan, message: 'Subscription plan created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/subscriptions — list all active/inactive subscriptions
router.get('/', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status } = req.query;
        const where = status && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus)
            ? { status: status as SubscriptionStatus }
            : undefined;

        const subscriptions = await prisma.subscription.findMany({
            where,
            include: {
                plan: true,
                quotation: {
                    include: {
                        customer: { select: { id: true, name: true, email: true } },
                    },
                },
            },
            orderBy: { nextBillDate: 'asc' },
        });

        res.json({ data: subscriptions });
    } catch (err) {
        next(err);
    }
});

// POST /api/subscriptions/attach — link a recurring subscription plan to a quotation
router.post(
    '/attach',
    authenticateStaff,
    validate(attachSubscriptionSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId, planId } = req.body;

            const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
            if (!plan) {
                throw new NotFoundError(`Subscription plan with id ${planId} not found`);
            }

            // Next bill date calculated based on cycle (1 month, 3 months, or 12 months from now)
            const nextBillDate = new Date();
            if (plan.cycle === SubscriptionCycle.MONTHLY) {
                nextBillDate.setMonth(nextBillDate.getMonth() + 1);
            } else if (plan.cycle === SubscriptionCycle.QUARTERLY) {
                nextBillDate.setMonth(nextBillDate.getMonth() + 3);
            } else if (plan.cycle === SubscriptionCycle.YEARLY) {
                nextBillDate.setFullYear(nextBillDate.getFullYear() + 1);
            }

            const subscription = await prisma.subscription.upsert({
                where: { quotationId },
                update: {
                    planId,
                    status: SubscriptionStatus.ACTIVE,
                    nextBillDate,
                },
                create: {
                    quotationId,
                    planId,
                    status: SubscriptionStatus.ACTIVE,
                    nextBillDate,
                },
                include: { plan: true },
            });

            res.status(200).json({ data: subscription, message: 'Subscription attached successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PATCH /api/subscriptions/:id/status — pause or cancel subscription
router.patch(
    '/:id/status',
    authenticateStaff,
    validate(updateStatusSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const updated = await prisma.subscription.update({
                where: { id: req.params.id },
                data: { status: req.body.status },
                include: { plan: true },
            });

            res.json({ data: updated, message: `Subscription status updated to ${req.body.status}` });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
