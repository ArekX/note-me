export default function ProtectingNotesPage() {
    return (
        <div>
            <h1>Protecting Notes</h1>

            <p>
                Notes contents can be protected by clicking on the lock icon in
                the note itself (or in the top right menu if you are viewing the
                note from a phone).
            </p>

            <p>
                Locking a note will encrypt the note's contents with your own
                password. Please note that if you forget the password you{" "}
                <strong>will not be able to recover</strong>{" "}
                the note even if administrator resets your password.
            </p>

            <p>
                Protected note contents are encrypted also on the server and as
                such are only ever visible to you when you enter your password.
                Please note that no files are ever encrypted and are always
                visible to the server.
            </p>

            <p>
                Locked notes will be marked by a lock in the side menu. Their
                contents is not searchable and will not be shown in the search
                results. When you open a locked note you will be prompted to
                enter your password to enter unlock mode. When in unlock mode
                you can view all protected notes without having to enter the
                password again. You can enter/exit unlock mode by clicking on
                the lock icon in the sidebar menu. Note that unlock mode will
                auto-lock after 5 minutes of inactivity.
            </p>
        </div>
    );
}
