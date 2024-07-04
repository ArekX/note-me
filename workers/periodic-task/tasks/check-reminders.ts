import {
    getReadyReminders,
    resolveReminderNextOcurrence,
} from "$backend/repository/note-reminder-repository.ts";
import { createNotification } from "$backend/repository/notification-repository.ts";
import { EVERY_MINUTE, PeriodicTask } from "../periodic-task-service.ts";
import { sendMessageToWebsocket } from "$workers/periodic-task/worker-message.ts";
import { runInTransaction } from "$backend/database.ts";
import { workerLogger } from "$backend/logger.ts";

export const checkReminders: PeriodicTask = {
    name: "check-reminders",
    interval: EVERY_MINUTE,
    async trigger(): Promise<void> {
        const readyReminders = await getReadyReminders();

        for (const reminder of readyReminders) {
            try {
                await runInTransaction(async () => {
                    const record = await createNotification({
                        data: {
                            type: "reminder-received",
                            payload: {
                                noteId: reminder.note_id,
                            },
                        },
                        user_id: reminder.user_id,
                    });

                    await resolveReminderNextOcurrence(reminder.id);

                    sendMessageToWebsocket("notifications", "addNotification", {
                        data: record,
                        toUserId: reminder.user_id,
                    });
                });
            } catch (e) {
                workerLogger.error(
                    "Error while processing note reminder ID {reminderId}: {error}",
                    {
                        reminderId: reminder.id,
                        error: e.message || e,
                    },
                );
            }
        }
    },
};
