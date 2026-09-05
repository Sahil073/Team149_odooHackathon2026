import { eventBus } from './event-bus';
import { EventPayloadMap, EventName } from './event-types';
import { createLogger } from '../utils/logger';

const log = createLogger('event-subscriber');

export function subscribe<E extends EventName>(
    event: E,
    handler: (payload: EventPayloadMap[E]) => void | Promise<void>,
): void {
    eventBus.on(event, async (payload) => {
        try {
            await handler(payload);
        } catch (err) {
            log.error({ event, err }, 'subscriber failed');
        }
    });
}