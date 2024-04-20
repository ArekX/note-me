import { TimerHandler, TimerService } from "../periodic-timer-service.ts";

let service: TimerService | null = null;

export const checkReminders: TimerHandler = {
    triggerEveryMinutes: 1,
    onRegister(_parentService: TimerService): void {
        service = _parentService;
    },
    trigger(): Promise<void> {
        if (!Deno.env.get("TEST_TIMER")) {
            return Promise.resolve();
        }
        service?.sendMessage({
            type: "note-reminder-received",
            payload: {
                noteId: 1,
                remindUserIds: [1],
            },
        });
        // TODO: Check reminder notes and send notifications.
        return Promise.resolve();
    },
};
