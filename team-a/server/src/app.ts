import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { routes } from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';

export function createApp(): Application {
    const app = express();

    app.use(helmet());
    app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
    app.use(express.json());
    app.use(pinoHttp({ logger }));

    app.get('/health', (_req, res) => res.json({ status: 'ok' }));

    app.use('/api', routes);

    // Anything not matched above becomes a clean 404 via the error handler
    app.use((req, _res, next) => next(new NotFoundError(`No route for ${req.method} ${req.path}`)));

    // Must stay last — Express only treats a 4-arg function as an error handler
    app.use(errorMiddleware);

    return app;
}

export const app = createApp();