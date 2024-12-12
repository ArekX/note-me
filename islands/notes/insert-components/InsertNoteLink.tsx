import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    SearchNoteMessage,
    SearchNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import { NoteSearchRecord } from "../../../workers/database/query/note-search-repository.ts";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import NoteItemView from "../../sidebar/search/NoteItemView.tsx";

interface InsertNoteLinkData {
    noteId: number;
}

const Component = ({
    onInsertDataChange,
}: InsertComponentProps<InsertNoteLinkData>) => {
    const { sendMessage } = useWebsocketService();

    const selectedNoteId = useSignal<number | null>(null);

    const loader = useLoader(true);
    const query = useSignal("");
    const results = useSignal<NoteSearchRecord[]>([]);
    const hasMoreData = useSignal(true);
    const fromId = useSignal<number | undefined>(undefined);

    const findNotes = useDebouncedCallback(async () => {
        const response = await sendMessage<
            SearchNoteMessage,
            SearchNoteResponse
        >(
            "notes",
            "searchNote",
            {
                data: {
                    filters: {
                        type: "general",
                        query: query.value,
                        from_id: fromId.value,
                    },
                },
                expect: "searchNoteResponse",
            },
        );

        results.value = [
            ...results.value,
            ...response.results as NoteSearchRecord[],
        ];

        if (response.results.length < 10) {
            hasMoreData.value = false;
        }

        fromId.value = response.results[response.results.length - 1]?.id;
        loader.stop();
    });

    const handleSearch = (value: string) => {
        query.value = value;
        loader.start();
        results.value = [];
        fromId.value = undefined;
        hasMoreData.value = true;
        findNotes();
    };

    const handleSelectNote = (noteId: number) => {
        selectedNoteId.value = noteId;
        onInsertDataChange({ noteId });
    };

    useEffect(() => {
        findNotes();
    }, []);

    return (
        <div class="flex flex-col items-stretch justify-start">
            <div class="py-2 max-md:text-sm">
                Please select a note from which the link will be inserted, this
                link will dynamically show the latest title of the note.
            </div>
            <div>
                <Input
                    label="Find notes"
                    placeholder="Search..."
                    value={query.value}
                    onInput={handleSearch}
                />
            </div>

            <div class="border-solid border-gray-700 border rounded-lg mt-2 flex-grow overflow-auto">
                {loader.running && (
                    <div class="text-center p-5">
                        <Loader color="white" />
                    </div>
                )}
                {!loader.running && results.value.length === 0 && (
                    <div class="p-2 text-center text-gray-400">
                        No results found
                    </div>
                )}
                {!loader.running && (
                    <LoadMoreWrapper
                        addCss="note-link-result-view"
                        hasMore={hasMoreData.value}
                        onLoadMore={() => findNotes()}
                    >
                        {results.value.map((i) => (
                            <NoteItemView
                                record={i}
                                hideActiveNote={true}
                                addClass={selectedNoteId.value === i.id
                                    ? "bg-gray-600"
                                    : ""}
                                searchQuery={query.value}
                                onNoteClick={() => handleSelectNote(i.id)}
                            />
                        ))}
                    </LoadMoreWrapper>
                )}
            </div>
        </div>
    );
};

export const InsertNoteLinkDef: InsertComponent<
    "note-link",
    "link",
    InsertNoteLinkData
> = {
    id: "note-link",
    name: "Note Link",
    component: Component,
    icon: "link",
    description: "Insert a dynamic link to a note from list",
    insertButtons: {
        link: {
            name: "Insert Link",
            icon: "link",
            formatData: (data) => `{:note-link|${data.noteId}}`,
        },
    },
};
