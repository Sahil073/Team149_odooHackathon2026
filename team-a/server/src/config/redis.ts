import Redis, { Redis as RedisClient } from 'ioredis';
import { env } from './env';

function createClient(name: string): RedisClient {
    const client = new Redis(env.REDIS_URL, {
        // Don't auto-connect on construction — connectRedis() below controls exactly
        // when connections open, so server.ts can await them before accepting traffic.
        lazyConnect: true,
        retryStrategy(times: number) {
            return Math.min(times * 200, 5000);
        },
        maxRetriesPerRequest: 3,
    });

    client.on('connect', () => console.log(`✅ Redis (${name}) connected`));
    client.on('error', (err: Error) => console.error(`❌ Redis (${name}) error:`, err.message));
    client.on('close', () => console.warn(`🔌 Redis (${name}) connection closed`));

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
    await Promise.all([redis.connect(), redisPublisher.connect(), redisSubscriber.connect()]);
}

export async function disconnectRedis(): Promise<void> {
    await Promise.all([redis.quit(), redisPublisher.quit(), redisSubscriber.quit()]);
}