import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { NotFoundError } from '../utils/errors';

const router = Router();

const approvalRuleSchema = z.object({
    discountRangeMin: z.number().int().min(0).max(100),
    discountRangeMax: z.number().int().min(0).max(100),
    requiresManager: z.boolean().default(false),
    requiresFinance: z.boolean().default(false),
});

const batchRulesSchema = z.object({
    rules: z.array(approvalRuleSchema),
});

// GET /api/approval-chains — get all configured approval chain tiers
router.get('/', authenticateStaff, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rules = await prisma.approvalChainRule.findMany({
            orderBy: { discountRangeMin: 'asc' },
        });

        res.json({ data: rules });
    } catch (err) {
        next(err);
    }
});

// POST /api/approval-chains — add single rule (Admin only)
router.post(
    '/',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(approvalRuleSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await prisma.approvalChainRule.create({
                data: req.body,
            });

            res.status(201).json({ data: rule, message: 'Approval chain rule created successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// PUT /api/approval-chains — batch update/replace all rules (Admin only)
router.put(
    '/',
    authenticateStaff,
    requireRole('ADMIN'),
    validate(batchRulesSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { rules } = req.body;

            await prisma.$transaction(async (tx) => {
                await tx.approvalChainRule.deleteMany();
                await tx.approvalChainRule.createMany({ data: rules });
            });

            const updatedRules = await prisma.approvalChainRule.findMany({
                orderBy: { discountRangeMin: 'asc' },
            });

            res.json({ data: updatedRules, message: 'Approval chain updated successfully' });
        } catch (err) {
            next(err);
        }
    }
);

// DELETE /api/approval-chains/:id — delete a rule (Admin only)
router.delete(
    '/:id',
    authenticateStaff,
    requireRole('ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await prisma.approvalChainRule.delete({ where: { id: req.params.id } });
            res.json({ message: 'Approval chain rule deleted successfully' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
