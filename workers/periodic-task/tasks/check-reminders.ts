import { PeriodicTask } from "../periodic-task-service.ts";

export const checkReminders: PeriodicTask = {
    name: "check-reminders",
    interval: 1,
    trigger({
        sendMessage,
    }): Promise<void> {
        // TODO: This is dummy code. Implement reminder check

        if (!Deno.env.get("TEST_TIMER")) {
            return Promise.resolve();
        }
        sendMessage({
            type: "note-reminder-received",
            payload: {
                noteId: 1,
                remindUserIds: [1],
            },
        });

        return Promise.resolve();
    },
};
