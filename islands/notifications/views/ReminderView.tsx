import { NoteReminder } from "$backend/repository/notification-repository.ts";
import {
    NotificationViewProps,
} from "$islands/notifications/NotificationItem.tsx";

export const ReminderView = ({
    data,
}: NotificationViewProps<NoteReminder>) => {
    return (
        <div className=" p-4 rounded-md">
            <h3 className="text-xl font-bold mb-2">
                Reminder for note #{data.noteId}
            </h3>
        </div>
    );
};
