import Icon from "$components/Icon.tsx";
import RecentlyOpenedNotes from "$islands/dashboard/RecentlyOpenedNotes.tsx";

export default function Page() {
    return (
        <>
            <h2 class="text-4xl">Welcome to NoteMe!</h2>
            <div className="text-lg">
                <p class="text-lg mt-4">
                    NoteMe is a simple note-taking app that allows you to
                    create, edit, and delete notes.
                </p>

                <p class="mt-4">
                    Add your first note by clicking on the <Icon name="plus" />
                    {" "}
                    icon.
                </p>
            </div>

            <div class="flex py-5">
                <div class="w-1/4">
                    <RecentlyOpenedNotes />
                </div>
            </div>
        </>
    );
}
