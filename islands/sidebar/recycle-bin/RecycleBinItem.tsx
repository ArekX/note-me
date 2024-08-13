import TreeItemIcon from "$islands/tree/TreeItemIcon.tsx";
import { fromTreeRecord } from "$islands/tree/hooks/record-container.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { DeletedNoteRecord } from "$backend/repository/note-repository.ts";
import TimeAgo from "$components/TimeAgo.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useSignal } from "@preact/signals";
import Loader from "$islands/Loader.tsx";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FullyDeleteNoteMessage,
    RestoreDeletedNoteMessage,
    RestoreDeletedNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";

interface RecycleBinItemProps {
    record: DeletedNoteRecord;
}

type ItemAction = "fully-delete" | "restore";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export default function RecycleBinItem({ record }: RecycleBinItemProps) {
    const action = useSignal<ItemAction | null>(null);
    const restoreLoader = useLoader();

    const { sendMessage, dispatchMessage } = useWebsocketService();

    const restoreNote = async () => {
        await sendMessage<
            RestoreDeletedNoteMessage,
            RestoreDeletedNoteResponse
        >("notes", "restoreDeletedNote", {
            data: {
                id: record.id,
            },
            expect: "restoreDeletedNoteResponse",
        });
        action.value = null;
    };

    const fullyDeleteNote = () => {
        dispatchMessage<FullyDeleteNoteMessage>("notes", "fullyDeleteNote", {
            id: record.id,
        });
    };

    const handleConfirmedRestore = restoreLoader.wrap(async () => {
        if (action.value === "restore") {
            await restoreNote();
            return;
        }

        fullyDeleteNote();
    });

    return (
        <div class="p-2 hover:bg-gray-700/50 cursor-pointer flex group">
            <div class="w-4/6">
                <TreeItemIcon
                    container={fromTreeRecord({
                        type: "note",
                        id: record.id,
                        name: record.title,
                        is_encrypted: +record.is_encrypted,
                        has_children: 0,
                    })}
                />{" "}
                {record.title}
                <div class="text-sm text-gray-500">
                    <span>
                        <span title="Deleted at">
                            <Icon name="recycle" size="sm" />
                            {" "}
                        </span>
                        <TimeAgo time={record.deleted_at} />{" "}
                        <span title="Expires at">
                            <Icon name="calendar-minus" size="sm" />
                            {" "}
                        </span>
                        <TimeAgo
                            time={(record.deleted_at ?? 0) + THIRTY_DAYS}
                        />
                    </span>
                </div>
            </div>
            <div class="w-2/6 pt-1 text-right hidden group-hover:block">
                <Button
                    color="primary"
                    title="Restore note"
                    onClick={() => action.value = "restore"}
                >
                    <Icon name="undo" size="sm" />
                </Button>{" "}
                <Button
                    color="danger"
                    title="Fully delete note"
                    onClick={() => action.value = "fully-delete"}
                >
                    <Icon name="minus-circle" size="sm" />
                </Button>
            </div>
            {!!action.value && (
                <ConfirmDialog
                    prompt={restoreLoader.running
                        ? (
                            <Loader color="white">
                                {action.value === "restore"
                                    ? "Restoring"
                                    : "Deleting"} note...
                            </Loader>
                        )
                        : (
                            <>
                                <div>
                                    Are you sure you want to{" "}
                                    {action.value === "fully-delete"
                                        ? "fully delete"
                                        : "restore"} this note?
                                </div>
                                {action.value === "restore"
                                    ? (
                                        <div>
                                            <strong>Important:</strong>{" "}
                                            This note will be restored to the
                                            top level of the notes. Any
                                            associated groups will not be
                                            restored.
                                        </div>
                                    )
                                    : (
                                        <div>
                                            <strong>Important:</strong>{" "}
                                            This note will be permanently
                                            deleted and will no longer be
                                            recoverable.
                                        </div>
                                    )}
                            </>
                        )}
                    isProcessing={restoreLoader.running}
                    confirmText={action.value === "restore"
                        ? "Restore note"
                        : "Fully delete note"}
                    confirmColor={action.value === "restore"
                        ? "success"
                        : "danger"}
                    cancelColor={action.value === "restore"
                        ? "danger"
                        : "success"}
                    visible={true}
                    onCancel={() => action.value = null}
                    onConfirm={handleConfirmedRestore}
                />
            )}
        </div>
    );
}
