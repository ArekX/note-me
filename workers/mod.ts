import { BackgroundService } from "./background-service.ts";
import { WebSocketMessage } from "./services/websocket-server.ts";

export interface BackgroundServices {
  services: {
    websocketServer: BackgroundService<WebSocketMessage>;
    timingService: BackgroundService<unknown>;
  };
  startAll(): void;
}

export const backgroundServices: BackgroundServices = {
  services: {
    websocketServer: new BackgroundService("websocket-server"),
    timingService: new BackgroundService("timing-worker"),
  },
  startAll(): void {
    for (const [serviceName, service] of Object.entries(this.services)) {
      console.log(`Starting '${serviceName}' service.`);
      service.start();
    }
  },
};
