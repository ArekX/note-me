import { EVERY_MINUTE, PeriodicTask } from "../periodic-task-service.ts";

export const checkReminders: PeriodicTask = {
    name: "check-reminders",
    interval: EVERY_MINUTE,
    trigger(): Promise<void> {
        // TODO: Implement
        return Promise.resolve();
    },
};
