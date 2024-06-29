import Icon from "$components/Icon.tsx";
import UserPicker from "$islands/UserPicker.tsx";

export default function Page() {
    return (
        <>
            <h2 class="text-4xl">Welcome to NoteMe!</h2>
            <UserPicker
                selected={[]}
                onSelected={() => {}}
            />
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
        </>
    );
}
