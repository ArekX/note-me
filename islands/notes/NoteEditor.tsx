import { GroupRecord } from "$backend/repository/group-repository.ts";
import { useSignal } from "@preact/signals";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { MoreMenu } from "$islands/notes/MoreMenu.tsx";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { MenuItemActions } from "$islands/notes/MoreMenu.tsx";
import { inputHandler } from "$frontend/methods.ts";
import { createNote } from "$frontend/api.ts";
import { addNoteRequestSchema } from "$schemas/notes.ts";
import { validateSchema } from "$schemas/mod.ts";
import { ZodIssue } from "$schemas/deps.ts";
import { ErrorDisplay } from "$components/ErrorDisplay.tsx";
import { createRef } from "preact";
import { autosize, insertTextIntoField } from "$frontend/deps.ts";
import { updateNote } from "$frontend/api.ts";
import Viewer from "$islands/viewer/Viewer.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";

interface NoteData extends Pick<NoteRecord, "title" | "note"> {
    id?: number;
    tags: string[];
}

interface NoteEditorProps {
    note: NoteData;
    group: GroupRecord | null;
}

const getTagArray = (tagString: string) => {
    const sanitizedTagString = tagString
        .replace(/[^a-zA-Z0-9_# -]+/g, "")
        .replace(/#/g, " ")
        .replace(/ {2,}/g, " ")
        .replace(/\-{2,}/g, "-")
        .replace(/\_{2,}/g, "_")
        .trim();
    if (sanitizedTagString.length == 0) {
        return [];
    }

    return sanitizedTagString.split(" ");
};

const getFormattedTagString = (tagString: string) => {
    const tags = getTagArray(tagString);
    return tags.length > 0 ? `#${tags.join(" #")}` : "";
};

export const NoteEditor = ({
    group,
    note,
}: NoteEditorProps) => {
    const name = useSignal(note.title);
    const text = useSignal(note.note);
    const tagString = useSignal(getFormattedTagString(note.tags.join(" ")));
    const isSaving = useSignal(false);
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const isPreviewMode = useSignal(false);

    const validationErrors = useSignal<ZodIssue[]>([]);
    const textAreaRef = createRef<HTMLTextAreaElement>();

    const formatTagString = () => {
        tagString.value = getFormattedTagString(tagString.value);
    };

    const handleSave = async () => {
        isSaving.value = true;

        const noteToSave = {
            group_id: group ? +group.id : null,
            tags: getTagArray(tagString.value),
            text: text.value,
            title: name.value,
        };

        validationErrors.value = [];
        const errors = await validateSchema(addNoteRequestSchema, noteToSave);

        if (errors) {
            validationErrors.value = errors;
            isSaving.value = false;
            return;
        }

        if (note.id) {
            await updateNote(note.id, noteToSave);
        } else {
            await createNote(noteToSave);
        }

        isSaving.value = false;
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
        window.location.href = `/app/note/view-${note.id}`;
    };

    const handleTextKeyDown = (e: KeyboardEvent) => {
        if (!textAreaRef.current) {
            return;
        }
        if (e.key === "Tab") {
            insertTextIntoField(textAreaRef.current, "    ");
            e.preventDefault();
        }
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
    });

    useEffect(() => {
        if (!textAreaRef.current) {
            return;
        }

        autosize(textAreaRef.current);

        return () => {
            autosize.destroy(textAreaRef.current);
        };
    }, [textAreaRef]);

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
                        disabled={isSaving.value}
                        onInput={inputHandler((value) => name.value = value)}
                    />
                    <ErrorDisplay
                        errors={validationErrors.value}
                        path="title"
                    />
                </div>
                <div class="text-sm ml-2">
                    <Button
                        color={!isSaving.value ? "success" : "successDisabled"}
                        title="Save"
                        disabled={isSaving.value}
                        onClick={handleSave}
                    >
                        {!isSaving.value
                            ? <Icon name="save" size="lg" />
                            : <Loader color="white">Saving...</Loader>}
                    </Button>{" "}
                    {note.id && (
                        <>
                            <Button
                                color="primary"
                                disabled={isSaving.value}
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
                    {!isSaving.value && (
                        <MoreMenu
                            onMenuItemClick={handleMenuItemClicked}
                            inPreviewMode={isPreviewMode.value}
                            mode={note.id ? "edit-existing" : "edit-new"}
                        />
                    )}
                </div>
            </div>

            <div class="flex-grow">
                <input
                    class="outline-none block bg-transparent mt-2 w-full tag-editor"
                    type="text"
                    placeholder="Tag your note"
                    tabIndex={2}
                    value={tagString.value}
                    disabled={isSaving.value}
                    onInput={inputHandler((value) => tagString.value = value)}
                    onBlur={formatTagString}
                />
                <ErrorDisplay
                    errors={validationErrors.value}
                    path="tags"
                />
            </div>
            {group && <div class="text-sm">&rarr; in {group.name}</div>}
            <div class="mt-2">
                <ErrorDisplay
                    errors={validationErrors.value}
                    path="text"
                />
            </div>
            {isPreviewMode.value ? <Viewer text={text.value} /> : (
                <textarea
                    ref={textAreaRef}
                    class="text-editor flex-grow block basis-auto"
                    placeholder="Write your note here"
                    disabled={isSaving.value}
                    tabIndex={3}
                    onKeyDown={handleTextKeyDown}
                    onInput={inputHandler((value) => text.value = value)}
                >
                    {text.value}
                </textarea>
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
};
