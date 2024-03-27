import { ComponentChild } from "preact";

interface SharedNotesListProps {
    switcherComponent: ComponentChild;
}

export const SharedNotesList = ({
    switcherComponent,
}: SharedNotesListProps) => {
    return (
        <div>
            {switcherComponent}
            <div>Shared notes</div>
        </div>
    );
};
