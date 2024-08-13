import { Signal, useSignal } from "@preact/signals";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import MoreMenu from "$islands/notes/MoreMenu.tsx";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { MenuItemActions } from "$islands/notes/MoreMenu.tsx";
import { inputHandler } from "$frontend/methods.ts";
import { AddNoteRequest, addNoteRequestSchema } from "$schemas/notes.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import NoteTextArea from "./NoteTextArea.tsx";
import TagInput from "$islands/notes/TagInput.tsx";
import { useLoader } from "$frontend/hooks/use-loader.ts";
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
import Viewer from "$islands/markdown/Viewer.tsx";
import { useContentEncryption } from "$frontend/hooks/use-content-encryption.ts";
import { downloadTextAsMarkdown } from "$frontend/text-downloader.ts";
import { useActiveNoteEffect } from "$frontend/hooks/use-active-note.ts";

interface NoteData extends Pick<NoteRecord, "title" | "note" | "is_encrypted"> {
    id?: number;
    tags: string[];
    group_id: number | null;
    group_name: string | null;
}

interface NoteEditorProps {
    note: NoteData;
}

export default function NoteEditor({
    note,
}: NoteEditorProps) {
    const name = useSignal(note.title);
    const text = useSignal(note.note);
    const isProtected = useSignal(!!note.is_encrypted);
    const tags = useSignal<string[]>(note.tags);
    const noteId = useSignal<number | null>(note.id ?? null);
    const groupId = useSignal<number | null>(note.group_id ?? null);
    const groupName = useSignal<string | null>(note.group_name ?? null);
    const isSaving = useLoader();
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const isPreviewMode = useSignal(false);
    const wasDataChanged = useSignal(false);

    const contentEncryption = useContentEncryption();

    const [noteValidation, validateNote] = useValidation<AddNoteRequest>({
        schema: addNoteRequestSchema,
    });

    const { sendMessage } = useNoteWebsocket({
        noteId: noteId.value,
        onNoteUpdated: (data) => {
            name.value = data.title ?? name.value;

            tags.value = data.tags ?? tags.value;

            isProtected.value = !!(data.is_encrypted ?? isProtected.value);

            groupId.value = data.group_id !== undefined
                ? data.group_id
                : groupId.value;
            groupName.value = data.group_name !== undefined
                ? data.group_name
                : groupName.value;
        },
    });

    useActiveNoteEffect(noteId.value);

    useEffect(() => {
        name.value = note.title;
        text.value = note.note;
        tags.value = note.tags;
        isProtected.value = !!note.is_encrypted;
        noteId.value = note.id ?? null;
        groupId.value = note.group_id ?? null;
        groupName.value = note.group_name ?? null;
        wasDataChanged.value = false;
    }, [note]);

    const getNoteTextRequest = async () => {
        if (!isProtected.value) {
            return text.value;
        }

        return await contentEncryption.encryptText(text.value);
    };

    const handleSave = isSaving.wrap(async () => {
        const noteToSave: AddNoteRequest = {
            group_id: groupId.value,
            tags: tags.value,
            is_encrypted: isProtected.value,
            text: text.value,
            title: name.value,
        };

        if (!await validateNote(noteToSave)) {
            return;
        }

        noteToSave.text = await getNoteTextRequest();

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
            wasDataChanged.value = false;
            redirectTo.viewNote({ noteId: record.id });
        }
    });

    const handleMenuItemClicked = (action: MenuItemActions) => {
        switch (action) {
            case "preview":
                isPreviewMode.value = true;
                break;
            case "edit":
                isPreviewMode.value = false;
                break;
            case "download":
                downloadTextAsMarkdown(
                    name.value,
                    text.value,
                );
                break;
            case "details":
            case "history":
            case "share":
            case "remind":
            case "move":
            case "files":
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

    const withTagsDataChange = (value: typeof tags.value) => {
        const signalTags = tags.value.join(",");
        const newTags = value.join(",");

        if (signalTags != newTags) {
            wasDataChanged.value = true;
        }

        tags.value = value;

        return value;
    };

    const withDataChange = <T,>(signal: Signal<T>, value: T) => {
        if (signal.value != value) {
            wasDataChanged.value = true;
        }

        signal.value = value;

        return value;
    };

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
                            withDataChange(name, value)
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
                            : (
                                <Loader color="white" size="smButton">
                                    Saving...
                                </Loader>
                            )}
                    </Button>{" "}
                    <Button
                        color="primary"
                        title={isProtected.value ? "Unprotect" : "Protect"}
                        disabled={isSaving.running}
                        onClick={() => isProtected.value = !isProtected.value}
                    >
                        <Icon
                            name={isProtected.value
                                ? "lock-alt"
                                : "lock-open-alt"}
                            type={isProtected.value ? "solid" : "regular"}
                            size="lg"
                        />
                    </Button>{" "}
                    {noteId.value
                        ? (
                            <>
                                <Button
                                    color="danger"
                                    disabled={isSaving.running}
                                    title="Close"
                                    onClick={handleCancelChanges}
                                >
                                    <Icon
                                        name="minus-circle"
                                        size="lg"
                                        type="solid"
                                    />
                                </Button>
                                {" "}
                            </>
                        )
                        : null}
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
                    onChange={(newTags) => withTagsDataChange(newTags)}
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
                        withDataChange(
                            text,
                            newText,
                        )}
                />
            )}

            {noteId.value && windowMode.value !== null
                ? (
                    <NoteWindow
                        onClose={() => windowMode.value = null}
                        type={windowMode.value}
                        isExistingNoteProtected={isProtected.value}
                        existingNoteText={text.value}
                        noteId={noteId.value}
                    />
                )
                : null}
        </div>
    );
}
