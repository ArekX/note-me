import NoteDelete from "$islands/notes/windows/NoteDelete.tsx";
import NoteDetails from "./windows/NoteDetails.tsx";
import NoteHelp from "$islands/notes/windows/NoteHelp.tsx";
import NoteHistory from "$islands/notes/windows/NoteHistory.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
} from "$workers/websocket/api/notes/messages.ts";
import NoteShare from "$islands/notes/windows/NoteShare.tsx";
import Picker from "$components/Picker.tsx";
import NoteReminder from "$islands/notes/windows/NoteReminder.tsx";
import MoveGroupDialog from "../groups/MoveGroupDialog.tsx";

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
    noteText: string;
    noteId: number;
}

interface NoteWindowProps {
    type: NoteWindowTypes | null;
    noteId: number;
    noteText?: string;
    onClose: () => void;
}

export default function NoteWindow({
    type,
    noteId,
    noteText,
    onClose,
}: NoteWindowProps) {
    const noteTextView = useSignal<string>("");

    const { sendMessage } = useWebsocketService();

    const loadNoteText = async () => {
        const data = await sendMessage<
            GetNoteDetailsMessage,
            GetNoteDetailsResponse
        >(
            "notes",
            "getNoteDetails",
            {
                data: {
                    id: noteId,
                    options: {
                        include_note: true,
                    },
                },
                expect: "getNoteDetailsResponse",
            },
        );

        noteTextView.value = data.record.note;
    };

    useEffect(() => {
        if (noteText === undefined) {
            loadNoteText();
            return;
        }

        noteTextView.value = noteText ?? "";
    }, [noteText]);

    return (
        <Picker<NoteWindowTypes, NoteWindowComponentProps>
            selector={type}
            propsGetter={() => ({
                onClose,
                noteId,
                noteText: noteTextView.value,
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
