import NoteDelete from "$islands/notes/windows/NoteDelete.tsx";
import NoteDetails from "./windows/NoteDetails.tsx";
import NoteHelp from "$islands/notes/windows/NoteHelp.tsx";
import NoteHistory from "$islands/notes/windows/NoteHistory.tsx";
import NoteShare from "$islands/notes/windows/NoteShare.tsx";
import Picker from "$components/Picker.tsx";
import NoteReminder from "$islands/notes/windows/NoteReminder.tsx";
import MoveGroupDialog from "../groups/MoveGroupDialog.tsx";
import {
    InputNoteData,
    NoteTextHook,
    useNoteText,
} from "$islands/notes/hooks/use-note-text.ts";
import {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
} from "$workers/websocket/api/notes/messages.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import { addSystemErrorMessage } from "$frontend/toast-message.ts";
import { useEffect } from "preact/hooks";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Dialog from "$islands/Dialog.tsx";
import Loader from "$islands/Loader.tsx";

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
    existingNoteData?: InputNoteData;
    onClose: () => void;
}

export default function NoteWindow({
    type,
    noteId,
    existingNoteData,
    onClose,
}: NoteWindowProps) {
    const noteText = useNoteText({
        initialData: existingNoteData,
    });

    const inputDataLoader = useLoader();

    const { sendMessage } = useWebsocketService();

    const loadInputData = inputDataLoader.wrap(async () => {
        try {
            const response = await sendMessage<
                GetNoteDetailsMessage,
                GetNoteDetailsResponse
            >("notes", "getNoteDetails", {
                data: {
                    id: noteId,
                    options: {
                        include_note: true,
                    },
                },
                expect: "getNoteDetailsResponse",
            });

            noteText.setInputData({
                text: response.record.note,
                is_encrypted: response.record.is_encrypted ?? false,
            });
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
        }
    });

    useEffect(() => {
        if (existingNoteData) {
            noteText.setInputData(existingNoteData);
        } else {
            loadInputData();
        }
    }, [existingNoteData, noteId]);

    return inputDataLoader.running
        ? (
            <Dialog visible={true}>
                <Loader color="white" />
            </Dialog>
        )
        : (
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
