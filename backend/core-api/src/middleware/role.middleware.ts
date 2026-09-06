import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

// Usage: router.post('/approve', authenticateStaff, requireRole('SALES_MANAGER', 'FINANCE'), handler)
export function requireRole(...allowed: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new UnauthorizedError());
            return;
        }
        if (!allowed.includes(req.user.role)) {
            next(new ForbiddenError(`Requires one of: ${allowed.join(', ')}`));
            return;
        }
        next();
    };
}