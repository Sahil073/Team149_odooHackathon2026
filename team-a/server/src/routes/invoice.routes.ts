import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceType, InvoiceStatus, ProductCategory } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticateStaff } from '../middleware/auth.middleware';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

// GET /api/invoices — list invoices with filters
router.get('/', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status, type, quotationId } = req.query;
        const where: Record<string, unknown> = {};

        if (status && typeof status === 'string') where.status = status as InvoiceStatus;
        if (type && typeof type === 'string') where.type = type as InvoiceType;
        if (quotationId && typeof quotationId === 'string') where.quotationId = quotationId;

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                quotation: {
                    select: {
                        id: true,
                        customer: { select: { id: true, name: true, email: true } },
                    },
                },
                payments: true,
            },
            orderBy: { dueDate: 'asc' },
        });

        res.json({ data: invoices });
    } catch (err) {
        next(err);
    }
});

// GET /api/invoices/:id — get invoice with payment breakdown
router.get('/:id', authenticateStaff, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: req.params.id },
            include: {
                quotation: {
                    include: {
                        customer: true,
                        lines: { include: { product: true } },
                    },
                },
                payments: true,
            },
        });

        if (!invoice) {
            throw new NotFoundError(`Invoice with id ${req.params.id} not found`);
        }

        res.json({ data: invoice });
    } catch (err) {
        next(err);
    }
});

// POST /api/invoices/generate/:quotationId — generate hybrid invoices (One-time vs Recurring lines)
router.post(
    '/generate/:quotationId',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { quotationId } = req.params;

            const quotation = await prisma.quotation.findUnique({
                where: { id: quotationId },
                include: {
                    lines: { include: { product: true } },
                },
            });

            if (!quotation) {
                throw new NotFoundError(`Quotation with id ${quotationId} not found`);
            }

            if (quotation.lines.length === 0) {
                throw new BadRequestError('Quotation has no lines to invoice');
            }

            // Group lines by one-time (HARDWARE, SERVICES) vs recurring (SUBSCRIPTIONS)
            let oneTimeAmount = 0;
            let recurringAmount = 0;

            for (const line of quotation.lines) {
                const baseTotal = Number(line.unitPrice) * line.qty;
                const afterDiscount = baseTotal * (1 - line.discountPct / 100);
                const afterTax = afterDiscount * (1 + line.product.taxPct / 100);

                if (line.product.category === ProductCategory.SUBSCRIPTIONS) {
                    recurringAmount += afterTax;
                } else {
                    oneTimeAmount += afterTax;
                }
            }

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const generatedInvoices = [];

            // 1. Create One-Time invoice if hardware/services exist
            if (oneTimeAmount > 0) {
                const oneTimeInvoice = await prisma.invoice.create({
                    data: {
                        quotationId,
                        type: InvoiceType.ONE_TIME,
                        amount: Number(oneTimeAmount.toFixed(2)),
                        status: InvoiceStatus.PENDING,
                        dueDate,
                    },
                });
                generatedInvoices.push(oneTimeInvoice);
            }

            // 2. Create Recurring invoice if subscriptions exist
            if (recurringAmount > 0) {
                const recurringInvoice = await prisma.invoice.create({
                    data: {
                        quotationId,
                        type: InvoiceType.RECURRING,
                        amount: Number(recurringAmount.toFixed(2)),
                        status: InvoiceStatus.PENDING,
                        dueDate,
                    },
                });
                generatedInvoices.push(recurringInvoice);
            }

            res.status(201).json({
                data: generatedInvoices,
                message: `Generated ${generatedInvoices.length} hybrid invoice(s) for quotation`,
            });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
