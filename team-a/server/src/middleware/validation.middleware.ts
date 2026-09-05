import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

type Source = 'body' | 'query' | 'params';

// Usage: router.post('/quotations', validate(createQuotationSchema), handler)
export function validate(schema: ZodSchema, source: Source = 'body') {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            next(new ValidationError('Validation failed', result.error.flatten().fieldErrors));
            return;
        }
        req[source] = result.data;
        next();
    };
}