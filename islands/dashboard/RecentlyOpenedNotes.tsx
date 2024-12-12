import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { RecentNoteRecord } from "$db";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetRecentlyOpenedNotesMessage,
    GetRecentlyOpenedNotesResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import Icon from "$components/Icon.tsx";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import Button from "$components/Button.tsx";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import TimeAgo from "$components/TimeAgo.tsx";

export default function RecentlyOpenedNotes() {
    const loader = useLoader(true);

    const timeFormatter = useTimeFormat();

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                updateNoteResponse: (data) => {
                    if (!data.updated_data.title) {
                        return;
                    }

                    const note = results.value.find(
                        (note) => note.id === data.updated_id,
                    );

                    if (note) {
                        note.title = data.updated_data.title;
                        note.updated_at = getCurrentUnixTimestamp();

                        results.value = [...results.value];
                    }
                },
            },
        },
    });

    const results = useSignal<RecentNoteRecord[]>([]);

    const fetchNotes = loader.wrap(async () => {
        const response = await sendMessage<
            GetRecentlyOpenedNotesMessage,
            GetRecentlyOpenedNotesResponse
        >("notes", "getRecentlyOpenedNotes", {
            expect: "getRecentlyOpenedNotesResponse",
        });

        results.value = response.records;
    });

    const handleOpenNote = (noteId: number) => {
        redirectTo.viewNote({
            noteId,
        });
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    return (
        <div>
            <strong class="text-lg py-2 flex justify-between">
                <span>Recently Opened Notes{" "}</span>
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
                            <div class=" text-gray-400">
                                No notes found.
                            </div>
                        )}
                        {results.value.map((note) => (
                            <div
                                key={note.id}
                                class="p-2 hover:bg-gray-700 rounded-lg cursor-pointer"
                                onClick={() => handleOpenNote(note.id)}
                            >
                                <TreeItemIcon
                                    container={fromTreeRecord({
                                        type: "note",
                                        id: note.id,
                                        name: note.title,
                                        is_encrypted: +note.is_encrypted,
                                        has_children: 0,
                                    })}
                                />{" "}
                                {note.title}
                                <div class="text-sm text-gray-400">
                                    <span
                                        title={note.last_open_at
                                            ? timeFormatter.formatDateTime(
                                                note.last_open_at,
                                            )
                                            : ""}
                                    >
                                        <Icon name="show" size="sm" />{" "}
                                        <TimeAgo time={note.last_open_at} />
                                    </span>{" "}
                                    <span
                                        title={timeFormatter.formatDateTime(
                                            note.updated_at,
                                        )}
                                    >
                                        <Icon name="pencil" size="sm" />{" "}
                                        <TimeAgo time={note.updated_at} />
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
