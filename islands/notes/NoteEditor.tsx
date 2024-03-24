import { GroupRecord } from "$backend/repository/group-repository.ts";
import { useSignal } from "@preact/signals";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";

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

    function handleTextInput(e: Event) {
        const element = e.target as HTMLTextAreaElement;

        element.style.height = "auto";
        element.style.height = (element.scrollHeight) + "px";
        text.value = (e.target as HTMLInputElement).value;
    }

    return (
        <div class="note-editor flex flex-col">
            <div class="flex flex-row">
                <input
                    class="title-editor"
                    type="text"
                    placeholder="Name your note"
                    value={name.value}
                    onInput={(e: Event) =>
                        name.value = (e.target as HTMLInputElement).value}
                />
                <div class="text-sm">
                    <Button color="success">Save</Button>{" "}
                    <Button color="primary">
                        <Icon name="dots-horizontal-rounded" size="sm" />
                    </Button>
                </div>
            </div>

            <input
                class="outline-none bg-transparent"
                type="text"
                placeholder="Enter note tags (space separated)"
                value={tags.value}
                onInput={(e: Event) =>
                    tags.value = (e.target as HTMLInputElement).value}
            />
            {group && <div class="text-sm">&rarr; in {group.name}</div>}
            <textarea
                class="text-editor flex-grow block basis-auto"
                placeholder="Enter your note here"
                onInput={handleTextInput}
            >
                {text.value}
            </textarea>
        </div>
    );
};
