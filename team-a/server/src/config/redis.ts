import Redis, { Redis as RedisClient } from 'ioredis';
import { env } from './env';

function createClient(name: string): RedisClient {
    const client = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
            if (times > 1) {
                return null; // Don't spam retries if Redis isn't running locally
            }
            return 500;
        },
        maxRetriesPerRequest: 1,
    });

    client.on('connect', () => console.log(`✅ Redis (${name}) connected`));
    client.on('error', (err: Error) => {
        // Only log once on initial attempt, don't spam
        if (client.status === 'connecting' || client.status === 'connect') {
            console.error(`❌ Redis (${name}) error:`, err.message);
        }
    });
    client.on('close', () => { /* quiet on close */ });

    return client;
}

// General-purpose client: sessions, caching PriceList/Stock lookups for the
// fulfillment split calculation, rate limiting, etc.
export const redis = createClient('main');

// Separate connections for pub/sub. This isn't optional plumbing — once a Redis
// connection issues SUBSCRIBE, that connection is locked into subscriber mode and
// can no longer run normal GET/SET/etc. commands. Sharing `redis` above for pub/sub
// would silently break every other cache read the moment a subscription is added.
//
// Not wired into the event bus yet — events/event-bus.ts uses an in-process
// EventEmitter for the hackathon build. These are here and ready for the day you
// need durability/replay or a bus shared across multiple server instances.
export const redisPublisher = createClient('publisher');
export const redisSubscriber = createClient('subscriber');

export async function connectRedis(): Promise<void> {
    try {
        await Promise.all([redis.connect(), redisPublisher.connect(), redisSubscriber.connect()]);
    } catch (err: any) {
        console.warn(`⚠️ Redis connection failed: ${err.message}. Continuing with in-memory event bus.`);
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