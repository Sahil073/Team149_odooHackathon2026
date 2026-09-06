import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

// Makes req.user / req.customer typed everywhere downstream, no casting needed
declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: Role; email: string };
            customer?: { id: string; email: string };
        }
    }
}

function extractToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or malformed Authorization header');
    }
    return header.slice(7);
}

// Rep / Manager / Finance / Admin routes
export function authenticateStaff(req: Request, _res: Response, next: NextFunction): void {
    try {
        const token = extractToken(req);
        req.user = jwt.verify(token, env.JWT_SECRET) as { id: string; role: Role; email: string };
        next();
    } catch {
        next(new UnauthorizedError('Invalid or expired token'));
    }
}

// Customer Portal routes — supports customer portal token or staff preview token
export function authenticatePortal(req: Request, _res: Response, next: NextFunction): void {
    try {
        const token = extractToken(req);
        try {
            req.customer = jwt.verify(token, env.PORTAL_JWT_SECRET) as { id: string; email: string };
            next();
        } catch {
            // Allow staff tokens to inspect and test the portal
            req.user = jwt.verify(token, env.JWT_SECRET) as { id: string; role: Role; email: string };
            next();
        }
    } catch {
        next(new UnauthorizedError('Invalid or expired portal token'));
    }
}