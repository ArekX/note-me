import NoteDelete from "$islands/notes/windows/NoteDelete.tsx";
import NoteDetails from "./windows/NoteDetails.tsx";
import NoteHelp from "$islands/notes/windows/NoteHelp.tsx";
import NoteHistory from "$islands/notes/windows/NoteHistory.tsx";
import NoteShare from "$islands/notes/windows/NoteShare.tsx";
import Picker from "$components/Picker.tsx";
import NoteReminder from "$islands/notes/windows/NoteReminder.tsx";
import MoveGroupDialog from "../groups/MoveGroupDialog.tsx";
import {
    NoteTextHook,
    NoteTextRecord,
    useNoteText,
} from "$islands/notes/hooks/use-note-text.ts";

export type NoteWindowTypes =
    | "details"
    | "history"
    | "share"
    | "remind"
    | "help"
    | "move"
    | "delete";

export interface NoteWindowComponentProps {
    onClose: () => void;
    noteText: NoteTextHook;
    noteId: number;
}

interface NoteWindowProps {
    type: NoteWindowTypes | null;
    noteId: number;
    textRecord: NoteTextRecord;
    onClose: () => void;
}

export default function NoteWindow({
    type,
    noteId,
    textRecord,
    onClose,
}: NoteWindowProps) {
    const noteText = useNoteText({ record: textRecord });
    return (
        <Picker<NoteWindowTypes, NoteWindowComponentProps>
            selector={type}
            propsGetter={() => ({
                onClose,
                noteId,
                noteText,
            })}
            map={{
                details: (props) => <NoteDetails {...props} />,
                history: (props) => <NoteHistory {...props} />,
                share: (props) => <NoteShare {...props} />,
                remind: (props) => <NoteReminder {...props} />,
                move: (props) => (
                    <MoveGroupDialog
                        onClose={props.onClose}
                        recordId={props.noteId}
                        recordType="note"
                    />
                ),
                help: (props) => <NoteHelp {...props} />,
                delete: (props) => <NoteDelete {...props} />,
            }}
        />
    );
}
