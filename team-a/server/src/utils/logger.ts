import pino from 'pino';
import { env, isDevelopment } from '../config/env';

export const logger = pino({
    level: env.LOG_LEVEL,
    transport: isDevelopment
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
});

// Use per module: const log = createLogger('quotation-service')
export function createLogger(scope: string) {
    return logger.child({ scope });
}