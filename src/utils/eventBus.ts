import { EventEmitter } from 'events';
import { EventType, EventPayloads } from '../types/eventTypes.js';

class TypedEventEmitter extends EventEmitter {
    // 오버로딩을 통해 이벤트명과 Payload 타입 강제
    emit<T extends EventType>(eventName: T, payload: EventPayloads[T]): boolean {
        // console.log(`[EventBus] Emitting event: ${eventName}`, payload);
        return super.emit(eventName, payload);
    }

    on<T extends EventType>(eventName: T, listener: (payload: EventPayloads[T]) => void): this {
        return super.on(eventName, listener);
    }
}

export const eventBus = new TypedEventEmitter();
