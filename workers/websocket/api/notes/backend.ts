import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import { NotifyFullyDeletedNoteMessage } from "$workers/websocket/api/notes/messages.ts";
import { NoteBackendMessage } from "./messages.ts";
import { FullyDeleteNoteResponse } from "$workers/websocket/api/notes/messages.ts";

const handleNotifyFullyDeletedNote: ListenerFn<NotifyFullyDeletedNoteMessage> =
    ({
        message,
        service,
    }) => {
        const client = service.getClientByUserId(message.user_id);

        client?.send<FullyDeleteNoteResponse>({
            requestId: message.requestId,
            namespace: "notes",
            type: "fullyDeleteNoteResponse",
            deleted_id: message.note_id,
        });
    };

export const backendMap: RegisterListenerMap<NoteBackendMessage> = {
    notifyFullyDeletedNote: handleNotifyFullyDeletedNote,
};
