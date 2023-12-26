/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { checkReminders } from "../timing-handlers/check-reminders.ts";
import { TimingService } from "../timing-service.ts";

const timingService = new TimingService(60 * 1000, self);

timingService.registerHandler(checkReminders);

if (import.meta.main) {
  timingService.start();
}
