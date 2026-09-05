import { eventBus } from './event-bus';
import { EventPayloadMap, EventName } from './event-types';
import { createLogger } from '../utils/logger';

const log = createLogger('event-publisher');

export function publish<E extends EventName>(event: E, payload: EventPayloadMap[E]): void {
    log.info({ event, quotationId: (payload as { quotationId?: string }).quotationId }, 'event published');
    eventBus.emit(event, payload);
}