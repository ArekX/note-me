import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";

export interface NoteLinkProps {
    noteId: number;
}

export default function NoteLink({
    noteId,
}: NoteLinkProps) {
    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                updateNoteResponse: (data) => {
                    if (data.updated_id === noteId && data.updated_data.title) {
                        noteTitle.value = data.updated_data.title;
                    }
                },
            },
        },
    });

    const loader = useLoader(true);
    const noteTitle = useSignal("");
    const hasError = useSignal(false);

    const loadNoteData = loader.wrap(async () => {
        try {
            const response = await sendMessage<
                GetNoteDetailsMessage,
                GetNoteDetailsResponse
            >(
                "notes",
                "getNoteDetails",
                {
                    data: {
                        id: noteId,
                        options: {
                            include_title: true,
                        },
                    },
                    expect: "getNoteDetailsResponse",
                },
            );

            noteTitle.value = response.record.title;
        } catch {
            noteTitle.value = `Note #${noteId} not found`;
            hasError.value = true;
        }
    });

    const handleOpenNote = () => {
        if (hasError.value) {
            return;
        }
        redirectTo.viewNote({ noteId });
    };

    useEffect(() => {
        loadNoteData();
    }, [noteId]);

    const color = hasError.value ? "red" : "gray";

    return loader.running ? <Loader color="white" size="sm" /> : (
        <span
            onClick={handleOpenNote}
            class={`select-none inline-block border-solid border-${color}-500 py-1 px-2 border-2 cursor-pointer hover:bg-${color}-600`}
        >
            {noteTitle.value}
        </span>
    );
}
