import { NoteHelpAction } from "../HelpWindow.tsx";

export interface EditingNotePageProps {
    onAction: (action: NoteHelpAction) => void;
}

export default function EditingNotesPage({ onAction }: EditingNotePageProps) {
    return (
        <div>
            <h1>Editing</h1>

            <p>
                You can edit notes by clicking on the edit icon, clicking on the
                pencil icon in the sidebar, or clicking on edit in the top right
                menu of the note you are viewing (on a phone).
            </p>

            <p>
                In note editor you can set the title of the note, add one or
                more tags and edit the contents of the note. Please note that
                NoteMe works with markdown syntax which will be displayed here,
                refer to the{" "}
                <span
                    class="link"
                    onClick={() => onAction("open-markdown-syntax")}
                >
                    markdown syntax
                </span>{" "}
                to see what is supported.
            </p>

            <p>
                Tags are used to organize notes and can be by adding words to
                them separated by a # (hash) symbol. Tags can be used to easily
                search similar notes together which can be stored in one or more
                different groups.
            </p>

            <h1>Inserting content</h1>

            <p>
                When editing contents of a note you can use keyboard shortcuts
                to make the process faster and to insert predefined templates
                like links, images, and more. You can see the full list of
                shortcuts in the{" "}
                <span
                    class="link"
                    onClick={() => onAction("open-keyboard-shortcuts")}
                >
                    Keyboard Shortcuts
                </span>{" "}
                section.
            </p>

            <p>
                You can also insert content into your note by clicking on the +
                button in the bottom right corner of the note. This will open an
                insert dialog where you can choose to insert a link, image, code
                block, table or more. This insert dialog can also be opened by
                pressing ctrl+q on your keyboard.
            </p>

            <p>
                Files can also be inserted outside Insert Dialog, by dragging
                the files into the note editor or by pasting the file from the
                clipboard. Files will be uploaded to your profile and NoteMe
                will use best judgment of the file type to make a decision on
                how it should be inserted into the note, for example if you
                insert an image file it will be inserted as markdown image.
            </p>

            <h1>Previewing changes</h1>

            <p>
                You can preview changes to the note by clicking on "Preview
                mode" in the top right menu of the editor. This will open a
                preview of the note where you can see how the note will look
                when it is saved. You can close the preview by clicking on "Edit
                mode" in the same menu.
            </p>

            <h1>Protecting the note</h1>

            <p>
                You can protect your note by clicking on the lock icon or
                "Protect" / "Unprotect" in the top right menu (on phone). This
                will encrypt the note's contents with your password and so that
                only you can see its contents. Check{" "}
                <span
                    class="link"
                    onClick={() => onAction("open-protecting-notes")}
                >
                    Protecting Notes
                </span>{" "}
                for more information.
            </p>
        </div>
    );
}
