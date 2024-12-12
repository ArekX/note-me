import {
    NoteHistoryDataRecord,
    NoteHistoryMetaRecord,
} from "../../../../workers/database/query/note-history-repository.ts";
import { NoteRecord } from "$islands/notes/NoteWindow.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteHistoryRecordMessage,
    DeleteHistoryRecordResponse,
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
    RevertNoteToHistoryMessage,
    RevertNoteToHistoryResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { addMessage } from "$frontend/toast-message.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import ButtonGroup from "$components/ButtonGroup.tsx";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import Button from "$components/Button.tsx";
import ViewNote from "$islands/notes/ViewNote.tsx";
import { useEffect } from "preact/hooks";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import { tagsToString } from "$frontend/tags.ts";
import TextDiff from "$islands/TextDiff.tsx";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import Icon from "$components/Icon.tsx";
import DropdownMenu from "$islands/DropdownMenu.tsx";

export type ViewType = "preview" | "note" | "diff";

interface HistoryRecordViewProps {
    record: NoteHistoryMetaRecord;
    noteId: number;
    noteRecord: NoteRecord;
    initialView: ViewType;
    onClose: () => void;
    onViewChange?: (view: ViewType) => void;
    onSidePanelOpen?: () => void;
}

const viewTypes = {
    preview: {
        label: "Note",
        icon: "font",
    },
    note: {
        label: "Markdown",
        icon: "markdown",
    },
    diff: {
        label: "Diff",
        icon: "pencil",
    },
};

export default function HistoryRecordView(
    {
        record,
        noteId,
        noteRecord,
        onClose,
        initialView,
        onViewChange,
        onSidePanelOpen,
    }: HistoryRecordViewProps,
) {
    const confirmRevert = useSignal<boolean>(false);
    const confirmDelete = useSignal<boolean>(false);
    const loader = useLoader(true);

    const query = useResponsiveQuery();

    const { items, selectItem, selected } = useListState({
        preview: viewTypes.preview,
        note: viewTypes.note,
        diff: viewTypes.diff,
    }, initialView);

    const { sendMessage } = useWebsocketService();

    const handlePerformRevert = async () => {
        await sendMessage<
            RevertNoteToHistoryMessage,
            RevertNoteToHistoryResponse
        >("notes", "revertNoteToHistory", {
            data: {
                note_id: noteId,
                to_history_id: record.id,
            },
            expect: "revertNoteToHistoryResponse",
        });

        addMessage({
            type: "success",
            text: "Note has been reverted successfully.",
        });

        confirmRevert.value = false;

        onClose();
    };

    const handlePerformDelete = async () => {
        await sendMessage<
            DeleteHistoryRecordMessage,
            DeleteHistoryRecordResponse
        >("notes", "deleteHistoryRecord", {
            data: {
                id: record.id,
                note_id: noteId,
            },
            expect: "deleteHistoryRecordResponse",
        });

        confirmDelete.value = false;
    };

    const historyRecord = useSignal<NoteHistoryDataRecord | null>(null);

    const loadHistoryData = loader.wrap(async () => {
        const response = await sendMessage<
            GetNoteHistoryDataMessage,
            GetNoteHistoryDataResponse
        >(
            "notes",
            "getNoteHistoryData",
            {
                data: {
                    id: record.id,
                },
                expect: "getNoteHistoryDataResponse",
            },
        );

        historyRecord.value = response.data;
    });

    useEffect(() => {
        loadHistoryData();
    }, [record.id]);

    const handleSelectItem = (item: ViewType) => {
        selectItem(item);
        onViewChange?.(item);
    };

    if (loader.running || !historyRecord.value) {
        return <Loader color="white" />;
    }

    return (
        <>
            <div class="flex h-full flex-col flex-nowrap justify-start items-stretch">
                <div class="flex-shrink flex w-full pb-2">
                    <div class="basis-2/5 md:max-lg:basis-3/5 max-md:basis-1/4">
                        {query.min("md")
                            ? (
                                <ButtonGroup<typeof items>
                                    items={Object.fromEntries(
                                        query.between("md", "lg")
                                            ? Object.entries(items).map((
                                                [key, value],
                                            ) => [
                                                key,
                                                <Icon
                                                    name={value.icon}
                                                    size="sm"
                                                />,
                                            ])
                                            : Object.entries(items).map((
                                                [key, value],
                                            ) => [key, value.label]),
                                    )}
                                    activeItem={selected.value}
                                    onSelect={handleSelectItem}
                                />
                            )
                            : (
                                <>
                                    <Button
                                        color="primary"
                                        onClick={onSidePanelOpen}
                                        addClass="mb-2 md:mr-2 max-md:w-full max-md:block"
                                        title="Show versions"
                                    >
                                        <Icon name="history" size="sm" />
                                    </Button>
                                    <DropdownMenu
                                        popoverId="historyRecordView-0"
                                        displayType="inline"
                                        inlineDirection="left"
                                        buttonBorderClass="border border-b-0 max-md:w-full max-md:block"
                                        icon="show-alt"
                                        items={Object.keys(items).map((
                                            key,
                                        ) => ({
                                            icon: viewTypes[key as ViewType]
                                                .icon,
                                            name: viewTypes[key as ViewType]
                                                .label,
                                            onClick: () =>
                                                handleSelectItem(
                                                    key as ViewType,
                                                ),
                                        }))}
                                    />
                                </>
                            )}
                    </div>
                    <div class="max-md:flex-grow max-md:block hidden"></div>
                    <div class="basis-3/5 md:max-lg:basis-2/5 max-md:basis-1/4 text-right px-2 max-md:pr-0">
                        <Button
                            color="warning"
                            onClick={() => confirmRevert.value = true}
                            title="Revert to this version"
                            addClass="md:ml-2 mb-2 max-md:w-full max-md:block"
                        >
                            {query.max("lg")
                                ? <Icon name="undo" size="sm" />
                                : (
                                    <>
                                        Revert{" "}
                                        <span class="xl:inline-block hidden">
                                            to this Version
                                        </span>
                                    </>
                                )}
                        </Button>

                        <Button
                            color="danger"
                            onClick={() => confirmDelete.value = true}
                            title="Delete this version"
                            addClass="md:ml-2 max-md:w-full max-md:block"
                        >
                            {query.max("lg")
                                ? <Icon name="minus-circle" size="sm" />
                                : <>Delete</>}
                        </Button>
                    </div>
                </div>

                <div class="pt-2 bg-gray-900 basis-full flex-grow overflow-auto border border-gray-700 border-b-0 rounded-lg">
                    <div class="p-5">
                        <LockedContentWrapper
                            inputRecords={[historyRecord.value]}
                            protectedKeys={["note"]}
                            isLockedKey={"is_encrypted"}
                            unlockRender={(
                                { unlockedRecords: [unlockedRecord] },
                            ) => {
                                historyRecord.value = unlockedRecord;

                                const tags = unlockedRecord.tags.length > 0
                                    ? unlockedRecord.tags.split(",")
                                    : [];

                                if (selected.value === "note") {
                                    return (
                                        <div>
                                            <div class="text-2xl py-4">
                                                {unlockedRecord.title}
                                            </div>
                                            <div class="text-xl py-2">
                                                {tagsToString(tags)}
                                            </div>
                                            <pre class="py-4">
                                            {unlockedRecord.note}
                                            </pre>
                                        </div>
                                    );
                                }

                                if (selected.value === "diff") {
                                    return (
                                        <TextDiff
                                            text1={unlockedRecord.note}
                                            text2={noteRecord.text}
                                        />
                                    );
                                }

                                return (
                                    <ViewNote
                                        record={{
                                            id: noteId,
                                            note: unlockedRecord.note,
                                            title: unlockedRecord.title,
                                            tags: tags,
                                            updated_at: record.created_at,
                                            group_id: null,
                                            group_name: "",
                                            is_encrypted: false,
                                        }}
                                        disableTagLinks={true}
                                        readonly={true}
                                        historyMode={true}
                                    />
                                );
                            }}
                        />
                    </div>
                </div>
            </div>
            {confirmRevert.value && (
                <ConfirmDialog
                    visible={true}
                    prompt="Are you sure that you want to revert to this version? Current note will be saved as another version."
                    onConfirm={handlePerformRevert}
                    confirmText="Revert to this version"
                    confirmColor="warning"
                    onCancel={() => confirmRevert.value = false}
                />
            )}
            {confirmDelete.value && (
                <ConfirmDialog
                    visible={true}
                    prompt="Are you sure that you want to delete this version? This action cannot be undone."
                    onConfirm={handlePerformDelete}
                    confirmText="Delete this version"
                    confirmColor="danger"
                    onCancel={() => confirmDelete.value = false}
                />
            )}
        </>
    );
}
