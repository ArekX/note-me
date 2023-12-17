import { BackgroundService } from "./background-service.ts";

export const webSocketBackgroundService = new BackgroundService(
  "websocket-server",
);

export function startBackgroundServices() {
  console.log("Starting background services...");

  console.log("Starting WebSocket Server...");
  webSocketBackgroundService.start();

  console.log("Starting Timing service...");
  new BackgroundService("timing-worker").start();

  console.log("Background services started.");
}
