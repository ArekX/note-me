import { NoteHelpAction } from "$islands/notes/windows/NoteHelp.tsx";

export interface GeneralProps {
    onAction: (action: NoteHelpAction) => void;
}
export default function General({ onAction }: GeneralProps) {
    return (
        <div class="py-2">
            <h1>General</h1>

            <p>
                Notes are written using markdown. NoteMe supports all standard
                markdown features like headings, lists, links, images, code
                blocks, and more. You can check the full list of all{" "}
                <span
                    class="link"
                    onClick={() => onAction("open-markdown-syntax")}
                >
                    supported markdown in this help section
                </span>.
            </p>

            <p>
                Notes can be created by clicking on the "New Note" button in the
                left side menu.
            </p>
        </div>
    );
}
