import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { authenticateStaff } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { subscribe } from '../events/event-subscriber';

const router = Router();

// Register audit listeners for all system events
subscribe('QuotationUpdated', async (payload) => {
    try {
        await prisma.auditLog.create({
            data: {
                entityType: 'Quotation',
                entityId: payload.quotationId,
                userId: payload.salesRepId,
                action: 'QUOTATION_UPDATED',
                reason: `Quotation updated with ${payload.lines.length} lines`,
            },
        });
    } catch (err) {
        console.error('Failed to write QuotationUpdated audit log:', err);
    }
});

subscribe('ApprovalRequired', async (payload) => {
    try {
        await prisma.auditLog.create({
            data: {
                entityType: 'Quotation',
                entityId: payload.quotationId,
                action: 'APPROVAL_REQUIRED',
                reason: payload.reason,
            },
        });
    } catch (err) {
        console.error('Failed to write ApprovalRequired audit log:', err);
    }
});

subscribe('QuotationApproved', async (payload) => {
    try {
        await prisma.auditLog.create({
            data: {
                entityType: 'Quotation',
                entityId: payload.quotationId,
                action: 'QUOTATION_APPROVED',
                reason: `Approved with ${payload.approvedLines.length} line(s)`,
            },
        });
    } catch (err) {
        console.error('Failed to write QuotationApproved audit log:', err);
    }
});

subscribe('SplitSuggested', async (payload) => {
    try {
        await prisma.auditLog.create({
            data: {
                entityType: 'Quotation',
                entityId: payload.quotationId,
                action: 'FULFILLMENT_SPLIT_SUGGESTED',
                reason: `Split calculated across ${payload.splits.length} warehouse(s) via ${payload.generatedBy}`,
            },
        });
    } catch (err) {
        console.error('Failed to write SplitSuggested audit log:', err);
    }
});

subscribe('NegotiationSubmitted', async (payload) => {
    try {
        await prisma.auditLog.create({
            data: {
                entityType: 'Quotation',
                entityId: payload.quotationId,
                action: 'CUSTOMER_NEGOTIATION_SUBMITTED',
                reason: `Customer proposed counter discounts on ${payload.requestedChanges.length} line(s)`,
            },
        });
    } catch (err) {
        console.error('Failed to write NegotiationSubmitted audit log:', err);
    }
});

// GET /api/audit-log — filterable audit log reader (Managers and Admin)
router.get(
    '/',
    authenticateStaff,
    requireRole('SALES_MANAGER', 'FINANCE', 'ADMIN'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { entityType, entityId, userId, action } = req.query;
            const where: Record<string, string> = {};

            if (entityType && typeof entityType === 'string') where.entityType = entityType;
            if (entityId && typeof entityId === 'string') where.entityId = entityId;
            if (userId && typeof userId === 'string') where.userId = userId;
            if (action && typeof action === 'string') where.action = action;

            const logs = await prisma.auditLog.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
                orderBy: { timestamp: 'desc' },
                take: 100,
            });

            res.json({ data: logs });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
