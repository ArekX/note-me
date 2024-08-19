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
import Button from "$components/Button.tsx";
import { UserSharedNoteMeta } from "$backend/repository/note-share-repository.ts";
import SharedNoteItem from "$islands/sidebar/shared/SharedNoteItem.tsx";

export default function RecentlySharedWithMe() {
    const loader = useLoader(true);

    const { sendMessage } = useWebsocketService();

    const results = useSignal<UserSharedNoteMeta[]>([]);

    const fetchNotes = loader.wrap(async () => {
        const { records } = await sendMessage<
            FindSharedNotesMessage,
            FindSharedNotesResponse
        >("notes", "findSharedNotes", {
            data: {
                filters: {
                    limit: 5,
                },
            },
            expect: "findSharedNotesResponse",
        });

        results.value = records;
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    return (
        <div>
            <strong class="text-lg py-2 flex justify-between">
                <span>Recently Shared with Me{" "}</span>
                {!loader.running && (
                    <span class="pr-2">
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
                                No shared notes yet.
                            </div>
                        )}
                        {results.value.map((note) => (
                            <SharedNoteItem
                                addClass="rounded-lg"
                                key={note.share_id}
                                record={note}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
