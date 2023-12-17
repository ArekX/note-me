/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { checkReminders } from "../timing-handlers/check-reminders.ts";
import { TimingService } from "../timing-service.ts";

const timingService = new TimingService();

timingService.registerHandler(checkReminders);

console.log("Timing worker started.");
timingService.start();
