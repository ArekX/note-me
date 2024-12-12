import Dialog from "$islands/Dialog.tsx";
import { ItemType, TreeRecord } from "$db";
import Button from "$components/Button.tsx";
import GroupPicker from "./GroupPicker.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import {
    UpdateGroupMessage,
    UpdateGroupResponse,
} from "$workers/websocket/api/groups/messages.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";

interface MoveGroupDialogProps {
    recordId: number;
    recordType: ItemType;
    onClose: () => void;
}

export default function MoveGroupDialog({
    onClose,
    recordId,
    recordType,
}: MoveGroupDialogProps) {
    const selectedGroup = useSignal<TreeRecord | null>(null);

    const loader = useLoader();

    const { sendMessage } = useWebsocketService();

    const handleMove = loader.wrap(async () => {
        if (!selectedGroup.value) {
            return;
        }

        const newParentId = selectedGroup.value.id !== 0
            ? selectedGroup.value.id
            : null;

        if (recordType === "note") {
            await sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
                "notes",
                "updateNote",
                {
                    data: {
                        id: recordId,
                        data: {
                            group_id: newParentId,
                        },
                    },
                    expect: "updateNoteResponse",
                },
            );
        } else {
            await sendMessage<UpdateGroupMessage, UpdateGroupResponse>(
                "groups",
                "updateGroup",
                {
                    data: {
                        id: recordId,
                        data: {
                            parent_id: newParentId,
                        },
                    },
                    expect: "updateGroupResponse",
                },
            );
        }

        onClose();
    });

    const canBeMoved = recordType === "note" ||
        (recordType === "group" && recordId !== selectedGroup.value?.id);

    return (
        <Dialog
            canCancel={true}
            onCancel={onClose}
            title="Move to new group"
        >
            {loader.running
                ? (
                    <Loader color="white">
                        Moving {recordType} to new parent...
                    </Loader>
                )
                : (
                    <div>
                        <div>
                            Please select a for this {recordType}{" "}
                            to be moved to:
                        </div>
                        <div class="py-5">
                            <GroupPicker
                                allowRoot={true}
                                onPick={(group) => selectedGroup.value = group}
                                selectedId={selectedGroup.value?.id}
                            />
                        </div>

                        {selectedGroup.value !== null && (
                            <>
                                {canBeMoved
                                    ? (
                                        <div class="pb-5">
                                            {recordType[0].toUpperCase() +
                                                recordType.slice(1)}{" "}
                                            will be moved to group &rarr;{"  "}
                                            {selectedGroup.value.name}
                                        </div>
                                    )
                                    : (
                                        <div class="pb-5 text-red-600">
                                            Cannot move a group into itself.
                                        </div>
                                    )}
                                {canBeMoved && (
                                    <Button
                                        onClick={handleMove}
                                        color={selectedGroup.value !== null
                                            ? "success"
                                            : "successDisabled"}
                                        disabled={selectedGroup.value === null}
                                        addClass="mr-2"
                                    >
                                        Move
                                    </Button>
                                )}
                            </>
                        )}

                        <div class="text-right">
                            <Button onClick={onClose} color="primary">
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
        </Dialog>
    );
}
