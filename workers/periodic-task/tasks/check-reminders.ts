import { getReadyReminders } from "$backend/repository/note-reminder-repository.ts";
import { createNotification } from "$backend/repository/notification-repository.ts";
import { EVERY_MINUTE, PeriodicTask } from "../periodic-task-service.ts";
import { sendMessageToWebsocket } from "$workers/periodic-task/worker-message.ts";

export const checkReminders: PeriodicTask = {
    name: "check-reminders",
    interval: EVERY_MINUTE,
    async trigger(): Promise<void> {
        const readyReminders = await getReadyReminders();

        for (const reminder of readyReminders) {
            const record = await createNotification({
                data: {
                    type: "reminder-received",
                    payload: {
                        noteId: reminder.note_id,
                    },
                },
                user_id: reminder.user_id,
            });

            sendMessageToWebsocket("notifications", "addNotification", {
                data: record,
                toUserId: reminder.user_id,
            });
        }
    },
};
