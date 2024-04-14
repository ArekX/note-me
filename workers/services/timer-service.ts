/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import "$std/dotenv/load.ts";
import { checkReminders } from "../timers/handlers/check-reminders.ts";
import { TimerService } from "../timers/periodic-timer-service.ts";

const timerService = new TimerService(60 * 1000, self);

timerService.registerHandler(checkReminders);

if (import.meta.main) {
    timerService.start();
}
