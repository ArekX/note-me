import { logger } from "$backend/logger.ts";
import { PeriodicTask } from "../periodic-task-service.ts";
import { startOfNextDay } from "../next-at.ts";
import { removeExpiredDeletedNotes as runRemoveExpiredDeletedNotes } from "$backend/repository/note-repository.ts";
import { sendMessageToWebsocket } from "$workers/websocket/websocket-worker-message.ts";
import { NoteBackendMessage } from "$workers/websocket/api/notes/messages.ts";

export const removeExpiredDeletedNotes: PeriodicTask = {
    name: "remove-expired-deleted-notes",
    getNextAt: startOfNextDay,
    async trigger(): Promise<void> {
        logger.info("Removing expired deleted notes older than 30 days");
        const notes = await runRemoveExpiredDeletedNotes(30);

        logger.info("Deleted {count} notes", {
            count: notes.length,
        });

        logger.info("Notifying users about fully deleted notes");
        for (const note of notes) {
            sendMessageToWebsocket<NoteBackendMessage>(
                "notes",
                "notifyFullyDeletedNote",
                {
                    note_id: note.id,
                    user_id: note.user_id,
                },
            );
        }

        logger.info("Delete finished");
    },
};
