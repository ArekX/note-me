import { GroupRecord } from "$backend/repository/group-repository.ts";
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
import { validateSchema } from "$schemas/mod.ts";
import { ZodIssue } from "$schemas/deps.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import Viewer from "$islands/viewer/Viewer.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import NoteTextArea from "./NoteTextArea.tsx";
import TagInput from "$islands/notes/TagInput.tsx";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import { redirectTo } from "$frontend/redirection-manager.ts";
import {
    CreateNoteMessage,
    CreateNoteResponse,
    UpdateNoteMessage,
    UpdateNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useNoteWebsocket } from "./hooks/use-note-websocket.ts";
import { SendFileDataMessage } from "$workers/websocket/api/file/messages.ts";
import { record } from "https://deno.land/x/zod@v3.22.4/types.ts";

interface NoteData extends Pick<NoteRecord, "title" | "note"> {
    id?: number;
    tags: string[];
    group_id: number;
    group_name: string;
}

interface NoteEditorProps {
    note: NoteData;
}

export default function NoteEditor({
    note,
}: NoteEditorProps) {
    const name = useSignal(note.title);
    const text = useSignal(note.note);
    const tags = useSignal<string[]>(note.tags);
    const isSaving = useLoader();
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const isPreviewMode = useSignal(false);
    const validationErrors = useSignal<ZodIssue[]>([]);

    const { sendMessage, sendBinaryMessage } = useNoteWebsocket({
        noteId: +note.id!,
    });

    const handleSave = async () => {
        isSaving.start();

        const noteToSave = {
            group_id: note.group_id,
            tags: tags.value,
            text: text.value,
            title: name.value,
        };

        validationErrors.value = [];
        const errors = await validateSchema(addNoteRequestSchema, noteToSave);

        if (errors) {
            validationErrors.value = errors;
            isSaving.stop();
            return;
        }

        if (note.id) {
            await sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
                "notes",
                "updateNote",
                {
                    data: {
                        id: note.id,
                        data: noteToSave,
                    },
                    expect: "updateNoteResponse",
                },
            );
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
        redirectTo.viewNote({ noteId: +note.id! });
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

        document.addEventListener("keydown", handleHotkeys);

        return () => {
            document.removeEventListener("keydown", handleHotkeys);
        };
    }, []);

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
                        onInput={inputHandler((value) => name.value = value)}
                    />
                    <ErrorDisplay
                        errors={validationErrors.value}
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
                    {note.id && (
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
                            mode={note.id ? "edit-existing" : "edit-new"}
                        />
                    )}
                </div>
            </div>

            <div class="flex-grow">
                <TagInput
                    isSaving={isSaving.running}
                    onChange={(newTags) => tags.value = newTags}
                    initialTags={tags.value}
                />
                <ErrorDisplay
                    errors={validationErrors.value}
                    path="tags"
                />
            </div>
            {note.group_id && (
                <div class="text-sm">&rarr; in {note.group_name}</div>
            )}
            <div class="mt-2">
                <ErrorDisplay
                    errors={validationErrors.value}
                    path="text"
                />
            </div>
            {isPreviewMode.value ? <Viewer text={text.value} /> : (
                <NoteTextArea
                    initialText={text.value}
                    isSaving={isSaving.running}
                    onChange={(newText) => text.value = newText}
                />
            )}
            {note.id && (
                <NoteWindow
                    onClose={() => windowMode.value = null}
                    type={windowMode.value}
                    noteId={note.id}
                />
            )}
        </div>
    );
}
