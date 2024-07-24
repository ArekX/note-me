import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import MoveGroupDialog from "../groups/MoveGroupDialog.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import GroupDetails from "$islands/groups/GroupDetails.tsx";

export type TreeWindowAction = "closed" | "confirmed-delete";

interface TreeWindowProps {
    container: RecordContainer;
    windowType: NoteWindowTypes;
    onAction: (action: TreeWindowAction) => void;
}

export default function TreeWindow({
    container,
    windowType,
    onAction,
}: TreeWindowProps) {
    return (
        <>
            {container.type === "note" && (
                <NoteWindow
                    noteId={container.id!}
                    type={windowType}
                    onClose={() => onAction("closed")}
                />
            )}
            {container.type === "group" && windowType === "move" && (
                <MoveGroupDialog
                    recordId={container.id!}
                    recordType={container.type}
                    onClose={() => onAction("closed")}
                />
            )}
            {container.type === "group" && windowType === "delete" && (
                <ConfirmDialog
                    prompt="Are you sure you want to delete this group?"
                    confirmText="Delete group"
                    confirmColor="danger"
                    visible={true}
                    onConfirm={() => onAction("confirmed-delete")}
                    onCancel={() => onAction("closed")}
                />
            )}
            {container.type === "group" && windowType === "details" && (
                <GroupDetails
                    groupId={+container.id!}
                    onClose={() => onAction("closed")}
                />
            )}
        </>
    );
}
