import NoteDelete from "$islands/notes/windows/NoteDelete.tsx";
import NoteDetails from "./windows/NoteDetails.tsx";
import NoteHelp from "$islands/notes/windows/NoteHelp.tsx";
import NoteHistory from "$islands/notes/windows/NoteHistory.tsx";
import NoteShare from "$islands/notes/windows/NoteShare.tsx";
import Picker from "$components/Picker.tsx";
import NoteReminder from "$islands/notes/windows/NoteReminder.tsx";
import MoveGroupDialog from "../groups/MoveGroupDialog.tsx";
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
import { useSignal } from "@preact/signals";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";
import NoteFiles from "$islands/notes/windows/NoteFiles.tsx";

export type NoteWindowTypes =
    | "details"
    | "history"
    | "share"
    | "remind"
    | "help"
    | "move"
    | "files"
    | "delete";

export interface NoteWindowComponentProps {
    onClose: () => void;
    isExistingNoteProtected: boolean;
    record: NoteRecord;
    noteId: number;
}

interface NoteWindowProps {
    type: NoteWindowTypes | null;
    noteId: number;
    isExistingNoteProtected?: boolean;
    existingNoteText?: string;
    onClose: () => void;
}

interface NoteRecord {
    text: string;
    is_encrypted: boolean;
}

export default function NoteWindow({
    type,
    noteId,
    existingNoteText,
    isExistingNoteProtected,
    onClose,
}: NoteWindowProps) {
    const inputDataLoader = useLoader();

    const noteRecord = useSignal<NoteRecord>({
        text: existingNoteText || "",
        is_encrypted: false,
    });

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

            noteRecord.value = {
                text: response.record.note,
                is_encrypted: response.record.is_encrypted,
            };
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
        }
    });

    useEffect(() => {
        if (existingNoteText) {
            noteRecord.value = {
                text: existingNoteText,
                is_encrypted: false,
            };
        } else {
            if (type !== "delete") {
                loadInputData();
            }
        }
    }, [existingNoteText, noteId]);

    if (inputDataLoader.running) {
        return (
            <Dialog visible={true}>
                <Loader color="white" />
            </Dialog>
        );
    }

    return (
        <LockedContentWrapper
            inputRecords={[noteRecord.value]}
            protectedKeys={["text"]}
            dialogMode={true}
            isLockedKey={"is_encrypted"}
            unlockRender={([record]) => {
                return (
                    <Picker<NoteWindowTypes, NoteWindowComponentProps>
                        selector={type}
                        propsGetter={() => ({
                            onClose,
                            isExistingNoteProtected:
                                isExistingNoteProtected !== undefined
                                    ? isExistingNoteProtected
                                    : record.is_encrypted,
                            noteId,
                            record,
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
                            files: (props) => <NoteFiles {...props} />,
                            help: (props) => <NoteHelp {...props} />,
                            delete: (props) => <NoteDelete {...props} />,
                        }}
                    />
                );
            }}
        />
    );
}
