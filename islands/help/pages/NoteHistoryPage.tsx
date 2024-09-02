export default function NoteHistoryPage() {
    return (
        <div>
            <h1>Note History</h1>

            <p>
                All changes to your notes are saved in a history. You can view
                history of all changes in the note by clicking on the history in
                the top right menu of the note.
            </p>

            <p>
                While in history you can see the note as it was at that point in
                time, you can also see the differences between that note and the
                current note by clicking on the diff button.
            </p>

            <p>
                Notes can also be restored by clicking on Revert to this version
                button. This will change all of the contents of the note to the
                contents of the note at that point in time. Please note that
                also the current note contents will be saved before that change
                is made as a history entry.
            </p>
        </div>
    );
}
