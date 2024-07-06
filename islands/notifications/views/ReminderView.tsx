import { NoteReminderData } from "$backend/repository/notification-repository.ts";
import {
    NotificationViewProps,
} from "$islands/notifications/NotificationItem.tsx";
import Button from "$components/Button.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";

export default function ReminderView({
    data,
}: NotificationViewProps<NoteReminderData>) {
    const handleOpenNote = () => {
        if (data.type === "own") {
            redirectTo.viewNote({ noteId: data.id });
        } else {
            redirectTo.viewSharedNote({
                noteId: data.id,
            });
        }
    };
    return (
        <div className=" p-4 rounded-md">
            <h3 className="text-sm font-bold mb-2">
                Reminder for note "{data.title}" from {data.user_name}
            </h3>

            <div>
                <Button color="success" size="xs" onClick={handleOpenNote}>
                    View
                </Button>
            </div>
        </div>
    );
}
