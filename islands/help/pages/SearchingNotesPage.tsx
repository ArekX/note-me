export default function SearchingNotesPage() {
    return (
        <div>
            <h1>Searching Notes</h1>

            <p>
                You can search notes by using the search bar in the sidebar.
                Search bar will search the currently chosen view which you have
                chosen, by default it is "Notes" showing your own notes. You can
                also search your Reminders, Note shared to you, and deleted
                notes by choosing the view from the sidebar by clicking on the
                "Notes" and picking the view from the dropdown.
            </p>

            <p>
                When you need better search options and a search bar is not
                enough you can click on the filter icon in the sidebar to open
                the advanced search options. Advanced search allows you to also
                search for all notes in a specific group (and all of its
                subgroups), or notes with one or more specified tags.
            </p>
        </div>
    );
}
