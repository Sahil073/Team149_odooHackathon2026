import { eventBus } from './event-bus';
import { EventPayloadMap, EventName } from './event-types';
import { createLogger } from '../utils/logger';
import { redisSubscriber } from '../config/redis';

const log = createLogger('event-subscriber');
const redisSubscribedChannels = new Set<string>();

// Handle incoming Redis messages from external services (Team B Smart Layer)
try {
    redisSubscriber.on('message', (channel: string, message: string) => {
        try {
            const payload = JSON.parse(message);
            eventBus.emit(channel as EventName, payload);
        } catch (e) {
            log.warn({ channel, err: e }, 'Failed to parse incoming Redis message');
        }
    });
} catch {
    // quiet if redis not running
}

export function subscribe<E extends EventName>(
    event: E,
    handler: (payload: EventPayloadMap[E]) => void | Promise<void>,
): void {
    // 1. In-memory Node bus
    eventBus.on(event, async (payload) => {
        try {
            await handler(payload);
        } catch (err) {
            log.error({ event, err }, 'subscriber failed');
        }
    });

    // 2. Subscribe Redis channel if Redis is active
    try {
        if (!redisSubscribedChannels.has(event)) {
            redisSubscribedChannels.add(event);
            if (redisSubscriber && redisSubscriber.status === 'ready') {
                redisSubscriber.subscribe(event).catch(() => {});
            }
        }
    } catch {
        // quiet fallback
    }
}