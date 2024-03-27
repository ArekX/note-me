import { GroupRecord } from "$backend/repository/group-repository.ts";
import { useSignal } from "@preact/signals";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { MoreMenu, MoreMenuItem } from "$islands/notes/MoreMenu.tsx";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { MenuItemActions } from "$islands/notes/MoreMenu.tsx";
import { inputHandler } from "$frontend/methods.ts";

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

    const handleTextInput = (e: Event) => {
        const element = e.target as HTMLTextAreaElement;

        element.style.height = "auto";
        element.style.height = (element.scrollHeight + 20) + "px";
        text.value = (e.target as HTMLInputElement).value;
    };

    const handleSave = () => {
        isSaving.value = true;
    };

    const handleMenuItemClicked = (action: MenuItemActions) => {
        console.log("execute action", action);
    };

    useEffect(() => {
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                handleSave();
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
                <input
                    class="title-editor"
                    type="text"
                    placeholder="Name your note"
                    tabIndex={1}
                    value={name.value}
                    disabled={isSaving.value}
                    onInput={inputHandler((value) => name.value = value)}
                />
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
                    {!isSaving.value && (
                        <MoreMenu onMenuItemClick={handleMenuItemClicked} />
                    )}
                </div>
            </div>

            <input
                class="outline-none bg-transparent mt-2"
                type="text"
                placeholder="Tag your note"
                tabIndex={2}
                value={tags.value}
                disabled={isSaving.value}
                onInput={inputHandler((value) => tags.value = value)}
            />
            {group && <div class="text-sm">&rarr; in {group.name}</div>}
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
