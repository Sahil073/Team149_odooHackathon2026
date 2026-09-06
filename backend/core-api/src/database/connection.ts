import { connectDatabase, disconnectDatabase } from '../config/database';
import { connectRedis, disconnectRedis } from '../config/redis';

// Single entry point server.ts calls before accepting traffic.
export async function connectAll(): Promise<void> {
    await connectDatabase();
    await connectRedis();
}

// Mirrors connectAll — called on SIGTERM/SIGINT so no connection is left dangling.
export async function disconnectAll(): Promise<void> {
    await Promise.all([disconnectDatabase(), disconnectRedis()]);
}

// Wire this once in server.ts: registerShutdownHooks().
export function registerShutdownHooks(): void {
    const shutdown = async (signal: string) => {
        console.log(`${signal} received, shutting down`);
        await disconnectAll();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}