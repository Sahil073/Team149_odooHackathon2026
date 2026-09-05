import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PaymentMethod, InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { validate } from '../middleware/validation.middleware';
import { authenticateStaff } from '../middleware/auth.middleware';
import { NotFoundError, BadRequestError } from '../utils/errors';

const router = Router();

const recordPaymentSchema = z.object({
    invoiceId: z.string().min(1, 'invoiceId is required'),
    amount: z.number().positive('Payment amount must be greater than 0'),
    method: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
});

// POST /api/payments — record payment and update invoice status
router.post(
    '/',
    authenticateStaff,
    validate(recordPaymentSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { invoiceId, amount, method } = req.body;

            const invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                include: { payments: true },
            });

            if (!invoice) {
                throw new NotFoundError(`Invoice with id ${invoiceId} not found`);
            }

            if (invoice.status === InvoiceStatus.PAID) {
                throw new BadRequestError('This invoice has already been fully paid');
            }

            // Create payment record
            const payment = await prisma.payment.create({
                data: {
                    invoiceId,
                    amount,
                    method,
                },
            });

            // Calculate total paid including the new payment
            const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0) + amount;

            // If fully settled, update status to PAID
            let updatedInvoice = invoice;
            if (totalPaid >= Number(invoice.amount)) {
                updatedInvoice = await prisma.invoice.update({
                    where: { id: invoiceId },
                    data: { status: InvoiceStatus.PAID },
                    include: { payments: true },
                });
            }

            res.status(201).json({
                data: payment,
                invoiceStatus: updatedInvoice.status,
                totalPaid: Number(totalPaid.toFixed(2)),
                message: `Payment of $${amount} recorded. Invoice is now ${updatedInvoice.status}`,
            });
        } catch (err) {
            next(err);
        }
    }
);

// GET /api/payments/:invoiceId — list payments for a given invoice
router.get(
    '/:invoiceId',
    authenticateStaff,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const payments = await prisma.payment.findMany({
                where: { invoiceId: req.params.invoiceId },
                orderBy: { paidAt: 'desc' },
            });

            res.json({ data: payments });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
