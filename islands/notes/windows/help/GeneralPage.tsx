import { NoteHelpAction } from "$islands/notes/windows/NoteHelp.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";

export interface GeneralPageProps {
    onAction: (action: NoteHelpAction) => void;
}
export default function General({ onAction }: GeneralPageProps) {
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
                left side menu. If wish to import one or more notes from your
                files, you can import them from{"  "}
                <span class="link" onClick={() => redirectTo.userData()}>
                    data section
                </span>{"  "}
                in your profile.
            </p>

            <p>
                Every note is directly tied to the user who created it, but
                notes can be shared with other users or publicly. Check{" "}
                <span
                    class="link"
                    onClick={() => onAction("open-sharing-notes")}
                >
                    "Sharing Notes"
                </span>{" "}
                for more information.
            </p>

            <p>
                Notes can be organized into groups. Groups can be created by
                clicking on the "New Group" button in the left side menu. Notes
                can be moved between groups by dragging them to the desired
                group.
            </p>

            <p>
                You can download all notes as Markdown files by clicking on
                "Download" in the upper right menu of the note. If you wish to
                download all of your notes and files that can be done from the
                {" "}
                <span class="link" onClick={() => redirectTo.userData()}>
                    Data section
                </span>{" "}
                in your profile.
            </p>
        </div>
    );
}
