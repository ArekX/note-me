import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import { NoteDetailsRecord } from "$db";
import Button from "$components/Button.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useEffect } from "preact/hooks";
import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";
import ButtonGroup from "$components/ButtonGroup.tsx";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import Picker from "$components/Picker.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import TimeAgo from "$components/TimeAgo.tsx";

export default function NoteDetails(
    { noteId, onClose, record }: NoteWindowComponentProps,
) {
    const noteData = useSignal<NoteDetailsRecord | null>(null);

    const isNoteLoading = useLoader(true);

    const { sendMessage } = useWebsocketService();

    const { items, selected, selectItem } = useListState({
        general: "General",
        toc: "Table of Contents",
    }, "general");

    const loadNoteData = isNoteLoading.wrap(async () => {
        const response = await sendMessage<
            GetNoteDetailsMessage,
            GetNoteDetailsResponse
        >("notes", "getNoteDetails", {
            data: {
                id: noteId,
                options: {
                    include_note: false,
                    include_group: true,
                    include_user: true,
                    include_timestamp: true,
                    include_title: true,
                },
            },
            expect: "getNoteDetailsResponse",
        });

        noteData.value = response.record;
        noteData.value.note = record.text;
    });

    useEffect(() => {
        loadNoteData();
    }, [noteId]);

    const { group_name, created_at, updated_at, user_name, title } =
        noteData.value ??
            {};
    return (
        <Dialog
            visible
            canCancel
            onCancel={onClose}
            title="Details"
        >
            {isNoteLoading.running
                ? <Loader color="white">Loading note details...</Loader>
                : noteData.value && (
                    <div>
                        <ButtonGroup
                            activeItem={selected.value}
                            items={items}
                            onSelect={selectItem}
                        />

                        <div class="py-5">
                            <Picker<keyof typeof items>
                                selector={selected.value}
                                map={{
                                    general: () => (
                                        <>
                                            <strong>Note ID:</strong> {noteId}
                                            {" "}
                                            <br />
                                            <strong>Title:</strong> {title}{" "}
                                            <br />
                                            {group_name && (
                                                <>
                                                    <strong>Group:</strong>{" "}
                                                    {group_name}
                                                    <br />
                                                </>
                                            )}

                                            <strong>Created:</strong>{" "}
                                            <TimeAgo time={created_at} />
                                            <br />
                                            <strong>Last update:</strong>{" "}
                                            <TimeAgo time={updated_at} /> <br />
                                            <strong>Created by:</strong>{" "}
                                            {user_name}
                                        </>
                                    ),
                                    toc: () => (
                                        <div class="markdown-viewer">
                                            <TableOfContents
                                                text={noteData.value!.note}
                                                disableLinks
                                                noTocMessage="No table of contents found, ToC is generated from markdown headings."
                                            />
                                        </div>
                                    ),
                                }}
                            />
                        </div>

                        <div class="pt-4 text-right">
                            <Button onClick={onClose} color="primary">
                                Close
                            </Button>
                        </div>
                    </div>
                )}
        </Dialog>
    );
}
