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

interface NoteWindowProps {
    type: NoteWindowTypes | null;
    noteId: number;
    onClose: () => void;
}

interface NoteWindowComponentProps {
    onClose: () => void;
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

export default function NoteWindow({
    type,
    noteId,
    onClose,
}: NoteWindowProps) {
    if (!type) {
        return null;
    }

    const WindowComponent = windowComponents[type];

    if (!WindowComponent) {
        return null;
    }

    return <WindowComponent noteId={noteId} onClose={onClose} />;
}
