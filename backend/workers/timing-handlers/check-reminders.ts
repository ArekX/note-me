import { TimingHandler, TimingService } from "../timing-service.ts";

// let service: TimingService | null = null;

export const checkReminders: TimingHandler = {
    triggerEveryMinutes: 1,
    onRegister(_parentService: TimingService): void {
        // service = _parentService;
    },
    trigger(): Promise<void> {
        // service?.sendMessage({
        //     type: "note-reminder-received",
        //     payload: {
        //         noteId: 1,
        //         remindUserIds: [1],
        //     },
        // });
        // TODO: Check reminder notes and send notifications.
        return Promise.resolve();
    },
};
