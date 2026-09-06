import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QuotationStatus, ApprovalStep, ApprovalAction } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { publish } from '../events/event-publisher';
import { QuotationApprovedPayload } from '../events/event-types';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

const approvalActionSchema = z.object({
    note: z.string().optional(),
});

const returnActionSchema = z.object({
    note: z.string().min(1, 'Reason/note is required when returning a quotation for revision'),
});

// GET /api/approvals — view all quotations pending approval
router.get(
    '/',
    authenticateStaff,
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pending = await prisma.quotation.findMany({
                where: { status: QuotationStatus.PENDING_APPROVAL },
                include: {
                    customer: true,
                    salesRep: { select: { id: true, name: true, email: true } },
                    lines: { include: { product: true } },
                    approvals: { include: { reviewer: { select: { name: true, role: true } } } },
                },
                orderBy: { updatedAt: 'asc' },
            });

            res.json({ data: pending });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/approvals/:quotationId/approve — approve quotation
router.post(
    '/:quotationId/approve',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'FINANCE', 'ADMIN'),
    validate(approvalActionSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;
            const { note } = req.body;
            const user = req.user!;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: {
                    lines: true,
                    approvals: true,
                },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            if (quotation.status !== QuotationStatus.PENDING_APPROVAL) {
                throw new BadRequestError(`Cannot approve quotation with status ${quotation.status}`);
            }

            // Determine approval step based on user role
            const step = user.role === 'FINANCE' ? ApprovalStep.FINANCE : ApprovalStep.SALES_MANAGER;

            // Record approval
            await prisma.approval.create({
                data: {
                    quotationId,
                    step,
                    reviewerId: user.id,
                    action: ApprovalAction.APPROVED,
                    note,
                },
            });

            // Update quotation status to APPROVED
            const updated = await prisma.quotation.update({
                where: { id: quotationId },
                data: { status: QuotationStatus.APPROVED },
                include: { lines: true },
            });

            // Publish ICD §3.4 QuotationApproved
            const payload: QuotationApprovedPayload = {
                eventVersion: 1,
                quotationId: quotation.id,
                approvedLines: quotation.lines.map((l: any) => ({
                    productId: l.productId,
                    qtyOrdered: l.qty,
                })),
                approvedAt: new Date().toISOString(),
            };

            publish('QuotationApproved', payload);

            res.json({ data: updated, message: 'Quotation approved successfully and event emitted' });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/approvals/:quotationId/reject — reject quotation
router.post(
    '/:quotationId/reject',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'FINANCE', 'ADMIN'),
    validate(approvalActionSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;
            const { note } = req.body;
            const user = req.user!;

            const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            const step = user.role === 'FINANCE' ? ApprovalStep.FINANCE : ApprovalStep.SALES_MANAGER;

            await prisma.approval.create({
                data: {
                    quotationId,
                    step,
                    reviewerId: user.id,
                    action: ApprovalAction.REJECTED,
                    note,
                },
            });

            const updated = await prisma.quotation.update({
                where: { id: quotationId },
                data: { status: QuotationStatus.REJECTED },
            });

            res.json({ data: updated, message: 'Quotation rejected' });
        } catch (err) {
            next(err);
        }
    }
);

// POST /api/approvals/:quotationId/return — return for revision (back to DRAFT)
router.post(
    '/:quotationId/return',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'FINANCE', 'ADMIN'),
    validate(returnActionSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;
            const { note } = req.body;
            const user = req.user!;

            const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            const step = user.role === 'FINANCE' ? ApprovalStep.FINANCE : ApprovalStep.SALES_MANAGER;

            await prisma.approval.create({
                data: {
                    quotationId,
                    step,
                    reviewerId: user.id,
                    action: ApprovalAction.RETURNED,
                    note,
                },
            });

            const updated = await prisma.quotation.update({
                where: { id: quotationId },
                data: { status: QuotationStatus.DRAFT },
            });

            res.json({ data: updated, message: 'Quotation returned for revision' });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
