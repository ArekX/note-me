import FilePicker from "$islands/files/FilePicker.tsx";

export default function Page() {
    return (
        <div>
            <div class="py-4">
                Here you can see and manage files uploaded by all users to
                NoteMe. If a file is deleted, it will no longer be available to
                any user and any links pointing to that file in any of the notes
                will not work. <br />
                <br />If a file is made public, it will be available to all
                users.{" "}
                <br />If a file is made private, it will only be available to
                the user who uploaded it.
            </div>
            <FilePicker adminMode={true} />
        </div>
    );
}
