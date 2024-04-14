/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { checkReminders } from "./handlers/check-reminders.ts";
import { TimerService } from "./periodic-timer-service.ts";

const timerService = new TimerService(self);

timerService.registerHandler(checkReminders);

if (import.meta.main) {
    timerService.start();
}
