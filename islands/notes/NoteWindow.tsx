import NoteDelete from "$islands/notes/windows/NoteDelete.tsx";
import { JSX } from "preact/jsx-runtime";
import NoteDetails from "./windows/NoteDetails.tsx";
import NoteHelp from "$islands/notes/windows/NoteHelp.tsx";
import NoteHistory from "$islands/notes/windows/NoteHistory.tsx";

export type NoteWindowTypes =
    | "details"
    | "history"
    | "share"
    | "remind"
    | "help"
    | "delete";

export interface NoteWindowComponentProps {
    onClose: () => void;
    noteText: string;
    noteId: number;
}

const windowComponents: {
    [K in NoteWindowTypes]: (props: NoteWindowComponentProps) => JSX.Element;
} = {
    details: (props) => <NoteDetails {...props} />,
    history: (props) => <NoteHistory {...props} />,
    share: (props) => <NoteDetails {...props} />,
    remind: (props) => <NoteDetails {...props} />,
    help: (props) => <NoteHelp {...props} />,
    delete: (props) => <NoteDelete {...props} />,
};

interface NoteWindowProps {
    type: NoteWindowTypes | null;
    noteId: number;
    noteText: string;
    onClose: () => void;
}

export default function NoteWindow({
    type,
    noteId,
    noteText,
    onClose,
}: NoteWindowProps) {
    if (!type) {
        return null;
    }

    const WindowComponent = windowComponents[type];

    if (!WindowComponent) {
        return null;
    }

    return (
        <WindowComponent
            noteId={noteId}
            onClose={onClose}
            noteText={noteText}
        />
    );
}
