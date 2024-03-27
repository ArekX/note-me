import { ComponentChild } from "preact";

interface ReminderListProps {
    switcherComponent: ComponentChild;
}

export const RemindersList = ({
    switcherComponent,
}: ReminderListProps) => {
    return (
        <div>
            {switcherComponent}
            <div>Reminders list</div>
        </div>
    );
};
