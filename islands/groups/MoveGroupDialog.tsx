import Dialog from "$islands/Dialog.tsx";
import {
    ItemType,
    TreeRecord,
} from "$backend/repository/tree-list.repository.ts";
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

    return (
        <Dialog
            canCancel={true}
            onCancel={onClose}
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
                        <div class="pt-2 pb-2">
                            <GroupPicker
                                allowRoot={true}
                                onPick={(group) => selectedGroup.value = group}
                                selectedId={selectedGroup.value?.id}
                            />
                        </div>

                        {selectedGroup.value !== null && (
                            <div class="pb-2">
                                {recordType[0].toUpperCase() +
                                    recordType.slice(1)}{" "}
                                will be moved to new group:{" "}
                                {selectedGroup.value.name}
                            </div>
                        )}

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
                        <Button onClick={onClose} color="danger">Cancel</Button>
                    </div>
                )}
        </Dialog>
    );
}
