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

interface NoteEditorProps {
    note: Pick<NoteRecord, "title" | "note">;
    group: GroupRecord | null;
}

export const NoteEditor = ({
    group,
    note,
}: NoteEditorProps) => {
    const name = useSignal(note.title);
    const text = useSignal(note.note);
    const tags = useSignal("");
    const isSaving = useSignal(false);
    const validationErrors = useSignal<ZodIssue[]>([]);

    const handleTextInput = (e: Event) => {
        const element = e.target as HTMLTextAreaElement;

        element.style.height = "auto";
        element.style.height = (element.scrollHeight + 20) + "px";
        text.value = (e.target as HTMLInputElement).value;
    };

    const handleSave = async () => {
        isSaving.value = true;

        const noteToSave = {
            group_id: group ? +group.id : null,
            tags: tags.value.replace(/ {2,}/g, " ").trim().split(" "),
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

        const result = await createNote(noteToSave);

        console.log("saved note", result);

        isSaving.value = false;
    };

    const handleMenuItemClicked = (action: MenuItemActions) => {
        console.log("execute action", action);
    };

    const handleTogglePreview = () => {
    };

    useEffect(() => {
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                handleSave();
            }

            if (e.ctrlKey && e.key === "v") {
                e.preventDefault();
                handleTogglePreview();
            }
        };

        document.addEventListener("keydown", handleHotkeys);

        return () => {
            document.removeEventListener("keydown", handleHotkeys);
        };
    });

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
                        tabIndex={4}
                        disabled={isSaving.value}
                        onClick={handleSave}
                    >
                        {!isSaving.value
                            ? <Icon name="save" size="lg" />
                            : <Loader color="white">Saving...</Loader>}
                    </Button>{" "}
                    <Button
                        color="primary"
                        title="Preview"
                        tabIndex={5}
                        disabled={isSaving.value}
                        onClick={handleTogglePreview}
                    >
                        <Icon name="show" size="lg" />
                    </Button>{" "}
                    {!isSaving.value && (
                        <MoreMenu onMenuItemClick={handleMenuItemClicked} />
                    )}
                </div>
            </div>

            <div class="flex-grow">
                <input
                    class="outline-none block bg-transparent mt-2 w-full"
                    type="text"
                    placeholder="Tag your note"
                    tabIndex={2}
                    value={tags.value}
                    disabled={isSaving.value}
                    onInput={inputHandler((value) => tags.value = value)}
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
            <textarea
                class="text-editor flex-grow block basis-auto"
                placeholder="Write your note here"
                disabled={isSaving.value}
                tabIndex={3}
                onInput={handleTextInput}
            >
                {text.value}
            </textarea>
        </div>
    );
};
