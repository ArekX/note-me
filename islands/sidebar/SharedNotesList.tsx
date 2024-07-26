import { ComponentChild } from "preact";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import {
    FindSharedNotesMessage,
    FindSharedNotesResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useFilters } from "$frontend/hooks/use-filters.ts";
import {
    FindUserSharedNotesFilters,
    PublicSharedNote,
} from "$backend/repository/note-share-repository.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { redirectTo } from "$frontend/redirection-manager.ts";

interface SharedNotesListProps {
    switcherComponent: ComponentChild;
}

export default function SharedNotesList({
    switcherComponent,
}: SharedNotesListProps) {
    const notesLoader = useLoader();

    const { sendMessage } = useWebsocketService();

    const { filters } = useFilters<FindUserSharedNotesFilters>({
        initialFilters: () => ({}),
        onFilterLoad: () => {
            resetPage();
            return loadSharedNotes();
        },
    });

    const {
        results,
        page,
        setPagedData,
        resetPage,
    } = usePagedData<PublicSharedNote>();

    const loadSharedNotes = notesLoader.wrap(async () => {
        const { records } = await sendMessage<
            FindSharedNotesMessage,
            FindSharedNotesResponse
        >("notes", "findSharedNotes", {
            data: {
                filters: filters.value,
                page: page.value,
            },
            expect: "findSharedNotesResponse",
        });

        setPagedData(records);
    });

    useEffect(() => {
        loadSharedNotes();
    }, []);

    return (
        <div>
            {switcherComponent}
            {notesLoader.running ? <Loader color="white" /> : (
                <div>
                    {results.value.map((note) => (
                        <div
                            key={note.id}
                            class="p-2 cursor-pointer border-b-2 border-b-gray-500 last:border-b-transparent hover:bg-gray-500"
                            onClick={() =>
                                redirectTo.viewSharedNote({ noteId: note.id })}
                        >
                            <div class="text-md">
                                <strong>{note.title}</strong>
                            </div>
                            <div class="text-sm">by {note.user_name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
