import Help from "$islands/notes/windows/Help.tsx";
import NoteDelete from "$islands/notes/windows/NoteDelete.tsx";
import NoteDetails from "./windows/NoteDetails.tsx";

export type NoteWindowTypes =
    | "details"
    | "history"
    | "share"
    | "remind"
    | "help"
    | "delete";

interface NoteWindowProps {
    type: NoteWindowTypes | null;
    noteId: number;
    onClose: () => void;
}

export default function NoteWindow({
    type,
    noteId,
    onClose,
}: NoteWindowProps) {
    return (
        <>
            <NoteDetails
                onClose={onClose}
                noteId={noteId}
                show={type == "details"}
            />
            <Help show={type == "help"} onClose={onClose} />
            <NoteDelete
                noteId={noteId}
                show={type == "delete"}
                onClose={onClose}
            />
        </>
    );
}
