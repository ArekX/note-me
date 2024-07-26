import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Loader from "$islands/Loader.tsx";
import { timeAgo } from "$lib/time/time-ago.ts";
import { useEffect } from "preact/hooks";
import Icon from "$components/Icon.tsx";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Button from "$components/Button.tsx";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import { ReminderNoteRecord } from "$backend/repository/note-reminder-repository.ts";
import { useUser } from "$frontend/hooks/use-user.ts";

export default function RemindersEndingSoon() {
    const loader = useLoader(true);

    const user = useUser();

    const timeFormatter = useTimeFormat();

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                updateNoteResponse: (data) => {
                    if (!data.updated_data.title) {
                        return;
                    }

                    const note = results.value.find(
                        (note) => note.note_id === data.updated_id,
                    );

                    if (note) {
                        note.title = data.updated_data.title;
                        results.value = [...results.value];
                    }
                },
                setReminderResponse: () => fetchNotes(),
                removeReminderResponse: () => fetchNotes(),
            },
        },
    });

    const results = useSignal<ReminderNoteRecord[]>([]);

    const fetchNotes = loader.wrap(async () => {
        const response = await sendMessage<
            FindNoteRemindersMessage,
            FindNoteRemindersResponse
        >("notes", "findNoteReminders", {
            data: {
                filters: {
                    limit: 5,
                },
                page: 1,
            },
            expect: "findNoteRemindersResponse",
        });

        results.value = response.records.results;
    });

    const handleOpenNote = (note: ReminderNoteRecord) => {
        if (note.author_id === user.getUserId()) {
            redirectTo.viewNote({
                noteId: +note.note_id,
            });
            return;
        }

        redirectTo.viewSharedNote({
            noteId: +note.note_id,
        });
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    return (
        <div>
            <strong class="text-lg py-2 flex justify-between">
                <span>Reminders Ending Soon{" "}</span>
                {!loader.running && (
                    <span>
                        <Button color="success" onClick={fetchNotes} size="sm">
                            <Icon name="refresh" size="sm" />
                        </Button>
                    </span>
                )}
            </strong>
            <div>
                {loader.running ? <Loader color="white" /> : (
                    <>
                        {results.value.length === 0 && (
                            <div class=" text-gray-500">
                                No reminders set.
                            </div>
                        )}
                        {results.value.map((note) => (
                            <div
                                key={note.id}
                                class="p-2 hover:bg-gray-700 cursor-pointer"
                                onClick={() => handleOpenNote(note)}
                            >
                                <TreeItemIcon
                                    container={fromTreeRecord({
                                        type: "note",
                                        id: note.note_id,
                                        name: note.title,
                                        is_encrypted: note.is_encrypted,
                                        has_children: 0,
                                    })}
                                />{" "}
                                {note.title}
                                <div class="text-sm text-gray-500">
                                    <span
                                        title={note.next_at
                                            ? timeFormatter.formatDateTime(
                                                note.next_at,
                                            )
                                            : ""}
                                    >
                                        Reminder set {note.next_at
                                            ? timeAgo(note.next_at)
                                            : "N/A"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
