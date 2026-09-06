import { PrismaClient } from '@prisma/client';
import { env, isDevelopment } from './env';

// In dev, ts-node-dev/nodemon reloads this module on every file save. Without this
// global-cache trick, each reload creates a brand-new PrismaClient (and a brand-new
// Postgres connection pool) that's never closed — you'll exhaust Postgres's
// max_connections within a few minutes of active editing.
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
    return new PrismaClient({
        log: isDevelopment
            ? [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ]
            : [{ emit: 'stdout', level: 'error' }],
        datasources: {
            db: { url: env.DATABASE_URL },
        },
    });
}

export const prisma = global.__prisma ?? createPrismaClient();

if (isDevelopment) {
    global.__prisma = prisma;

    // Surface slow queries early — useful once the fulfillment split logic starts
    // doing joins across Stock/Warehouse/QuotationLine.
    // @ts-ignore - the 'query' event only exists on the client when log includes it
    prisma.$on('query', (e: { query: string; duration: number }) => {
        if (e.duration > 200) {
            console.warn(`[prisma] slow query (${e.duration}ms): ${e.query}`);
        }
    });
}

export let isDatabaseConnected = false;

export async function connectDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        isDatabaseConnected = true;
        console.log('✅ Postgres connected via Prisma');
    } catch (err: any) {
        isDatabaseConnected = false;
        console.warn('⚠️  Postgres not reachable at DATABASE_URL — starting in disconnected mode.');
        console.warn('   (Database queries will fail until Postgres is running or a cloud DB URL is provided)');
    }
}

export async function disconnectDatabase(): Promise<void> {
    isDatabaseConnected = false;
    await prisma.$disconnect();
    console.log('🔌 Postgres disconnected');
}