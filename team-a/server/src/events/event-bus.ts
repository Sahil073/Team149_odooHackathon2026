import { EventEmitter } from 'events';
import { EventPayloadMap, EventName } from './event-types';

class TypedEventBus {
    private emitter = new EventEmitter();

    constructor() {
        // Multiple modules subscribe to the same event (e.g. both risk-engine and
        // upsell-engine listen to QuotationUpdated) — default limit of 10 is too low.
        this.emitter.setMaxListeners(50);
    }

    emit<E extends EventName>(event: E, payload: EventPayloadMap[E]): void {
        this.emitter.emit(event, payload);
    }

    on<E extends EventName>(event: E, handler: (payload: EventPayloadMap[E]) => void): void {
        this.emitter.on(event, handler);
    }

    off<E extends EventName>(event: E, handler: (payload: EventPayloadMap[E]) => void): void {
        this.emitter.off(event, handler);
    }
}

// Single shared instance — every module imports this same bus
export const eventBus = new TypedEventBus();