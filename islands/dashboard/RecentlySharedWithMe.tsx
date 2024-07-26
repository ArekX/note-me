import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindSharedNotesMessage,
    FindSharedNotesResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import Icon from "$components/Icon.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Button from "$components/Button.tsx";
import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import { PublicSharedNote } from "$backend/repository/note-share-repository.ts";

export default function RecentlySharedWithMe() {
    const loader = useLoader(true);

    const { sendMessage } = useWebsocketService();

    const results = useSignal<PublicSharedNote[]>([]);

    const fetchNotes = loader.wrap(async () => {
        const { records } = await sendMessage<
            FindSharedNotesMessage,
            FindSharedNotesResponse
        >("notes", "findSharedNotes", {
            data: {
                filters: {
                    limit: 5,
                },
                page: 1,
            },
            expect: "findSharedNotesResponse",
        });

        results.value = records.results;
    });

    const handleOpenNote = (noteId: number) => {
        redirectTo.viewSharedNote({
            noteId,
        });
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    return (
        <div>
            <strong class="text-lg py-2 flex justify-between">
                <span>Recently Shared with Me{" "}</span>
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
                                No shared notes yet.
                            </div>
                        )}
                        {results.value.map((note) => (
                            <div
                                key={note.id}
                                class="p-2 hover:bg-gray-700 cursor-pointer"
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
                                <div class="text-sm text-gray-500">
                                    <span>
                                        Shared by {note.user_name}
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
