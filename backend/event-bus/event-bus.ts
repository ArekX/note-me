import { BusEvents } from "$backend/event-bus/bus-events.ts";

export interface BusEvent<Type, T> {
  type: Type;
  payload: T;
}

export interface EventHandler {
  eventTypes: string[];
  handle(event: BusEvents): void;
}

export class EventBus {
  #handlers: Set<EventHandler> = new Set();

  constructor(handlers: EventHandler[]) {
    for (const handler of handlers) {
      this.registerHandler(handler);
    }
  }

  registerHandler(handler: EventHandler) {
    this.#handlers.add(handler);
  }

  emit(event: BusEvents) {
    console.log("got", event);
    for (const handler of this.#handlers) {
      if (handler.eventTypes.includes(event.type)) {
        handler.handle(event);
      }
    }
  }
}
