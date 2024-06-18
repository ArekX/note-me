import { useSignal } from "@preact/signals";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import MoreMenu from "$islands/notes/MoreMenu.tsx";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { MenuItemActions } from "$islands/notes/MoreMenu.tsx";
import { inputHandler } from "$frontend/methods.ts";
import { addNoteRequestSchema } from "$schemas/notes.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import Viewer from "$islands/viewer/Viewer.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import NoteTextArea from "./NoteTextArea.tsx";
import TagInput from "$islands/notes/TagInput.tsx";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import {
    addBeforeRedirectListener,
    redirectTo,
    removeBeforeRedirectListener,
} from "$frontend/redirection-manager.ts";
import {
    CreateNoteMessage,
    CreateNoteResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useNoteWebsocket } from "./hooks/use-note-websocket.ts";
import DetailsLine from "$islands/notes/DetailsLine.tsx";
import { useValidation } from "$frontend/hooks/use-validation.ts";

interface NoteData extends Pick<NoteRecord, "title" | "note"> {
    id?: number;
    tags: string[];
    group_id: number | null;
    group_name: string;
}

interface NoteEditorProps {
    note: NoteData;
}

interface NoteRequestData {
    group_id: number | null;
    tags: string[];
    title: string;
    text: string;
}

export default function NoteEditor({
    note,
}: NoteEditorProps) {
    const name = useSignal(note.title);
    const text = useSignal(note.note);
    const tags = useSignal<string[]>(note.tags);
    const noteId = useSignal<number | null>(note.id ?? null);
    const groupId = useSignal<number | null>(note.group_id ?? null);
    const groupName = useSignal<string | null>(note.group_name ?? null);
    const isSaving = useLoader();
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const isPreviewMode = useSignal(false);
    const wasDataChanged = useSignal(false);

    const [noteValidation, validateNote] = useValidation<NoteRequestData>({
        schema: addNoteRequestSchema,
    });

    const { sendMessage } = useNoteWebsocket({
        noteId: noteId.value,
    });

    const handleSave = async () => {
        isSaving.start();

        const noteToSave: NoteRequestData = {
            group_id: groupId.value,
            tags: tags.value,
            text: text.value,
            title: name.value,
        };

        if (!await validateNote(noteToSave)) {
            isSaving.stop();
            return;
        }

        if (noteId.value) {
            await sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
                "notes",
                "updateNote",
                {
                    data: {
                        id: noteId.value,
                        data: noteToSave,
                    },
                    expect: "updateNoteResponse",
                },
            );
            wasDataChanged.value = false;
        } else {
            const { record } = await sendMessage<
                CreateNoteMessage,
                CreateNoteResponse
            >(
                "notes",
                "createNote",
                {
                    data: {
                        data: noteToSave,
                    },
                    expect: "createNoteResponse",
                },
            );
            redirectTo.viewNote({ noteId: record.id });
        }

        isSaving.stop();
    };

    const handleMenuItemClicked = (action: MenuItemActions) => {
        switch (action) {
            case "preview":
                isPreviewMode.value = true;
                break;
            case "edit":
                isPreviewMode.value = false;
                break;
            case "details":
            case "history":
            case "share":
            case "remind":
            case "help":
            case "delete":
                windowMode.value = action;
                break;
        }
    };

    const handleTogglePreview = () => {
        isPreviewMode.value = !isPreviewMode.value;
    };

    const handleCancelChanges = () => {
        redirectTo.viewNote({ noteId: noteId.value! });
    };

    useEffect(() => {
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
            if (e.ctrlKey && e.key === "e") {
                e.preventDefault();
                handleTogglePreview();
            }
        };

        const handleConfirmChangeDiscard = (e: BeforeUnloadEvent) => {
            if (wasDataChanged.value) {
                e.preventDefault();
            }
        };

        const confirmBeforeRedirect = () => {
            if (wasDataChanged.value) {
                return Promise.resolve(
                    confirm("Are you sure you want to discard changes?"),
                );
            }

            return Promise.resolve(true);
        };

        document.addEventListener("keydown", handleHotkeys);
        globalThis.addEventListener("beforeunload", handleConfirmChangeDiscard);
        addBeforeRedirectListener(confirmBeforeRedirect);

        return () => {
            document.removeEventListener("keydown", handleHotkeys);
            globalThis.removeEventListener(
                "beforeunload",
                handleConfirmChangeDiscard,
            );
            removeBeforeRedirectListener(confirmBeforeRedirect);
        };
    }, []);

    const withDataChange = (setter: () => void) => {
        const result = setter();
        wasDataChanged.value = true;
        return result;
    };

    useEffect(() => {
        name.value = note.title;
        text.value = note.note;
        tags.value = note.tags;
        noteId.value = note.id ?? null;
        groupId.value = note.group_id ?? null;
        groupName.value = note.group_name ?? null;
    }, [note]);

    return (
        <div class="note-editor flex flex-col">
            <div class="flex flex-row">
                <div class="flex-grow">
                    <input
                        class="title-editor"
                        type="text"
                        placeholder="Name your note"
                        tabIndex={1}
                        value={name.value}
                        disabled={isSaving.running}
                        onInput={inputHandler((value) =>
                            withDataChange(() => name.value = value)
                        )}
                    />
                    <ErrorDisplay
                        state={noteValidation}
                        path="title"
                    />
                </div>
                <div class="text-sm ml-2">
                    <Button
                        color={!isSaving.running
                            ? "success"
                            : "successDisabled"}
                        title="Save"
                        disabled={isSaving.running}
                        onClick={handleSave}
                    >
                        {!isSaving.running
                            ? <Icon name="save" size="lg" />
                            : <Loader color="white">Saving...</Loader>}
                    </Button>{" "}
                    {noteId.value && (
                        <>
                            <Button
                                color="primary"
                                disabled={isSaving.running}
                                title="Cancel changes"
                                onClick={handleCancelChanges}
                            >
                                <Icon
                                    name="tag-x"
                                    size="lg"
                                    type="solid"
                                />
                            </Button>
                            {" "}
                        </>
                    )}
                    {!isSaving.running && (
                        <MoreMenu
                            onMenuItemClick={handleMenuItemClicked}
                            inPreviewMode={isPreviewMode.value}
                            mode={noteId.value ? "edit-existing" : "edit-new"}
                        />
                    )}
                </div>
            </div>

            <div class="flex-grow">
                <TagInput
                    isSaving={isSaving.running}
                    onChange={(newTags) =>
                        withDataChange(() => tags.value = newTags)}
                    initialTags={tags.value}
                />
                <ErrorDisplay
                    state={noteValidation}
                    path="tags"
                />
            </div>
            <DetailsLine
                groupName={groupName.value}
            />
            <div class="mt-2">
                <ErrorDisplay
                    state={noteValidation}
                    path="text"
                />
            </div>
            {isPreviewMode.value ? <Viewer text={text.value} /> : (
                <NoteTextArea
                    initialText={text.value}
                    isSaving={isSaving.running}
                    onChange={(newText) =>
                        withDataChange(() => text.value = newText)}
                />
            )}
            {noteId.value && (
                <NoteWindow
                    onClose={() => windowMode.value = null}
                    type={windowMode.value}
                    noteId={noteId.value}
                />
            )}
        </div>
    );
}
