import { NoteReminderData } from "$backend/repository/notification-repository.ts";
import {
    NotificationViewProps,
} from "$islands/notifications/NotificationItem.tsx";

export default function ReminderView({
    data,
}: NotificationViewProps<NoteReminderData>) {
    return (
        <div className=" p-4 rounded-md">
            <h3 className="text-sm font-bold mb-2">
                Reminder for note #{data.noteId}
            </h3>
        </div>
    );
}
