import { GroupRecord } from "$backend/repository/group-repository.ts";
import { useSignal } from "@preact/signals";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { MoreMenu, MoreMenuItem } from "$islands/notes/MoreMenu.tsx";

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
        element.style.height = (element.scrollHeight + 20) + "px";
        text.value = (e.target as HTMLInputElement).value;
    }

    const moreMenuItems: MoreMenuItem[] = [
        {
            name: "Preview",
            icon: "show-alt",
            onClick: () => {},
        },
        {
            name: "Details", // created by, last update, author, generated table of contents
            icon: "detail",
            onClick: () => {},
        },
        {
            name: "History",
            icon: "history",
            onClick: () => {},
        },
        {
            name: "Share",
            icon: "share-alt",
            onClick: () => {},
        },
        {
            name: "Remind me",
            icon: "alarm",
            onClick: () => {},
        },
        {
            name: "Delete",
            icon: "minus-circle",
            onClick: () => {},
        },
    ];

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
                    <Button color="success" title="Save">
                        <Icon name="save" size="lg" />
                    </Button>{" "}
                    <MoreMenu items={moreMenuItems} />
                </div>
            </div>

            <input
                class="outline-none bg-transparent"
                type="text"
                placeholder="Tag your note"
                value={tags.value}
                onInput={(e: Event) =>
                    tags.value = (e.target as HTMLInputElement).value}
            />
            {group && <div class="text-sm">&rarr; in {group.name}</div>}
            <textarea
                class="text-editor flex-grow block basis-auto"
                placeholder="Write your note here"
                onInput={handleTextInput}
            >
                {text.value}
            </textarea>
        </div>
    );
};
