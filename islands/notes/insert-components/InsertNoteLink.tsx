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
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import { NoteSearchRecord } from "$backend/repository/note-search-repository.ts";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import TreeItemView from "$islands/sidebar/search/TreeItemView.tsx";

const Component = ({
    onCancel,
    onInsert,
}: InsertComponentProps) => {
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

        results.value = [...results.value, ...response.records];

        if (response.records.length < 10) {
            hasMoreData.value = false;
        }

        fromId.value = response.records[response.records.length - 1]?.id;
        loader.stop();
    });

    const handleInsert = () => {
        onInsert(`{:note-link|${selectedNoteId.value}}`);
        onCancel();
    };

    const handleSearch = (value: string) => {
        query.value = value;
        loader.start();
        results.value = [];
        fromId.value = undefined;
        hasMoreData.value = true;
        findNotes();
    };

    useEffect(() => {
        findNotes();
    }, []);

    return (
        <div class="w-2/3">
            <div>
                <Input
                    label="Find notes"
                    placeholder="Search..."
                    value={query.value}
                    onInput={handleSearch}
                />
            </div>

            <div class="border-solid border-gray-700 border-2 p-2 mt-2">
                {loader.running && <Loader color="white" />}
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
                            <TreeItemView
                                record={i}
                                addClass={selectedNoteId.value === i.id
                                    ? "bg-gray-600"
                                    : ""}
                                searchQuery={query.value}
                                onNoteClick={() => selectedNoteId.value = i.id}
                            />
                        ))}
                    </LoadMoreWrapper>
                )}
            </div>

            <div class="mt-2 flex items-center">
                <div class="mr-2">
                    <Button
                        color={selectedNoteId.value === null
                            ? "successDisabled"
                            : "success"}
                        disabled={selectedNoteId.value === null}
                        size="md"
                        onClick={handleInsert}
                    >
                        <Icon name="link" size="lg" /> Insert
                    </Button>
                </div>

                <div>
                    <Button
                        color="danger"
                        onClick={onCancel}
                        size="md"
                    >
                        <Icon name="minus-circle" size="lg" /> Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const InsertNoteLinkDef: InsertComponent<"note-link"> = {
    id: "note-link",
    name: "Note Link",
    component: Component,
};
