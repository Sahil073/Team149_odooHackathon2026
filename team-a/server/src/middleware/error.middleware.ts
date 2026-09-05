import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

// 4 args is what makes Express treat this as an error handler — keep the signature exact
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof ValidationError) {
        res.status(err.statusCode).json({ error: err.message, details: err.details });
        return;
    }

    if (err instanceof AppError) {
        if (!err.isOperational) {
            logger.error({ err, path: req.path }, 'non-operational error');
        }
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const prismaErr = err as Prisma.PrismaClientKnownRequestError;
        if (prismaErr.code === 'P2002') {
            res.status(409).json({ error: 'A record with this value already exists' });
            return;
        }
        if (prismaErr.code === 'P2025') {
            res.status(404).json({ error: 'Record not found' });
            return;
        }
    }

    logger.error({ err, path: req.path }, 'unhandled error');
    res.status(500).json({ error: 'Internal server error' });
}