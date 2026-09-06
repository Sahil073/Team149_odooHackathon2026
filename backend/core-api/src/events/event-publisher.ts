import { eventBus } from './event-bus';
import { EventPayloadMap, EventName } from './event-types';
import { createLogger } from '../utils/logger';
import { redisPublisher } from '../config/redis';

const log = createLogger('event-publisher');

export function publish<E extends EventName>(event: E, payload: EventPayloadMap[E]): void {
    log.info({ event, quotationId: (payload as { quotationId?: string }).quotationId }, 'event published');
    eventBus.emit(event, payload);

    try {
        if (redisPublisher && redisPublisher.status === 'ready') {
            redisPublisher.publish(event, JSON.stringify(payload)).catch((err) => {
                log.warn({ event, err }, 'Failed to publish event to Redis');
            });
        }
    } catch {
        // quiet fallback if Redis is not running
    }
}