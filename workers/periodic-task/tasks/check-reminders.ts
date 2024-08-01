import {
    getReadyReminders,
    resolveReminderNextOcurrence,
} from "$backend/repository/note-reminder-repository.ts";
import { createNotification } from "$backend/repository/notification-repository.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { sendMessageToWebsocket } from "$workers/websocket/websocket-worker-message.ts";
import { createTransaction } from "$backend/database.ts";
import { logger } from "$backend/logger.ts";
import { getNoteInfo } from "$backend/repository/note-repository.ts";
import { nextMinute } from "$workers/periodic-task/next-at.ts";

export const checkReminders: PeriodicTask = {
    name: "check-reminders",
    getNextAt: nextMinute,
    async trigger(): Promise<void> {
        const readyReminders = await getReadyReminders();

        for (const reminder of readyReminders) {
            try {
                const note = await getNoteInfo(reminder.note_id);

                if (!note) {
                    continue;
                }

                const transaction = await createTransaction();

                await transaction.run(async () => {
                    const record = await createNotification({
                        data: {
                            type: "reminder-received",
                            payload: {
                                id: note.id,
                                title: note.title,
                                user_name: note.user_name,
                                type: note.user_id === reminder.user_id
                                    ? "own"
                                    : "shared",
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
                logger.error(
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
