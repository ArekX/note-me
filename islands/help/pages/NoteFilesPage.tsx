import { redirectTo } from "$frontend/redirection-manager.ts";

export default function NoteFiles() {
    return (
        <div>
            <h1>Files</h1>

            <p>
                Files can be uploaded into NoteMe and then can be used directly
                in notes as images or links to download them. Once a file is
                uploaded it can be used in any of your own notes.
            </p>

            <p>
                Every uploaded file is private by default, meaning that only you
                can see it. If you want to share a file with others you can make
                it public by clicking on the eye icon on the file in the{"  "}
                <span onClick={() => redirectTo.userFiles()} class="link">
                    file list in your profile.
                </span>.
            </p>

            <p>
                Uploaded files are not encrypted even if the note itself is
                protected. This because files can be used in both protected and
                unprotected notes.
            </p>

            <p>
                When inserting files into notes you can insert more of them by
                holding the Ctrl key while clicking on the files. This will
                insert all selected files into the note at once.
            </p>
        </div>
    );
}
