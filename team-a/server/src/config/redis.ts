import Redis, { Redis as RedisClient } from 'ioredis';
import { env } from './env';

function createClient(name: string): RedisClient {
    let loggedError = false;
    const client = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy() {
            // Don't retry if Redis isn't running locally
            return null;
        },
        maxRetriesPerRequest: 1,
    });

    client.on('connect', () => console.log(`✅ Redis (${name}) connected`));
    client.on('error', (_err: Error) => {
        // Suppress repeated console spam when Redis isn't running locally in dev
        if (!loggedError) {
            loggedError = true;
        }
    });
    client.on('close', () => { /* quiet on close */ });

    return client;
}

// General-purpose client: sessions, caching PriceList/Stock lookups for the
// fulfillment split calculation, rate limiting, etc.
export const redis = createClient('main');

// Separate connections for pub/sub.
export const redisPublisher = createClient('publisher');
export const redisSubscriber = createClient('subscriber');

export async function connectRedis(): Promise<void> {
    try {
        await Promise.all([redis.connect(), redisPublisher.connect(), redisSubscriber.connect()]);
    } catch {
        console.log('ℹ️  Redis not running locally (optional) — using built-in in-memory event bus.');
    }
}

export async function disconnectRedis(): Promise<void> {
    try {
        await Promise.all([
            redis.status === 'ready' ? redis.quit() : Promise.resolve(),
            redisPublisher.status === 'ready' ? redisPublisher.quit() : Promise.resolve(),
            redisSubscriber.status === 'ready' ? redisSubscriber.quit() : Promise.resolve(),
        ]);
    } catch {
        // ignore on shutdown
    }
}