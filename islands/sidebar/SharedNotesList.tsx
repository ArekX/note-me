import { ComponentChild } from "preact";

interface SharedNotesListProps {
    switcherComponent: ComponentChild;
}

export default function SharedNotesList({
    switcherComponent,
}: SharedNotesListProps) {
    return (
        <div>
            {switcherComponent}
            <div>Shared notes</div>
        </div>
    );
}
