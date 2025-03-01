import { PeriodicTask } from "../periodic-task-service.ts";
import { sendMessageToWebsocket } from "../../websocket/host.ts";
import { logger } from "$backend/logger.ts";
import { nextMinute } from "../next-at.ts";
import { repository } from "$db";

export const checkReminders: PeriodicTask = {
    name: "check-reminders",
    getNextAt: nextMinute,
    async trigger(): Promise<void> {
        const readyReminders = await repository.noteReminder
            .getReadyReminders();

        for (const reminder of readyReminders) {
            try {
                const note = await repository.note.getNoteInfo(
                    reminder.note_id,
                );

                if (!note) {
                    continue;
                }

                const record = await repository.notification.createNotification(
                    {
                        data: {
                            type: "reminder-received",
                            payload: {
                                id: note.id,
                                reminder_id: reminder.id,
                                title: note.title,
                                is_encrypted: note.is_encrypted,
                                user_id: note.user_id,
                                user_name: note.user_name,
                                type: note.user_id === reminder.user_id
                                    ? "own"
                                    : "shared",
                            },
                        },
                        user_id: reminder.user_id,
                    },
                );

                await repository.noteReminder.resolveReminderNextOcurrence(
                    reminder.id,
                );

                sendMessageToWebsocket("notifications", "addNotification", {
                    data: record,
                    toUserId: reminder.user_id,
                });
            } catch (e: unknown) {
                logger.error(
                    "Error while processing note reminder ID {reminderId}: {error}",
                    {
                        reminderId: reminder.id,
                        error: (e as Error).message || e,
                    },
                );
            }
        }
    },
};
