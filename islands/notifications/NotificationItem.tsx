import { NotificationRecord } from "$backend/repository/notification-repository.ts";

interface NotificationItemProps {
    notification: NotificationRecord;
}

export const NotificationItem = ({
    notification,
}: NotificationItemProps) => {
    const { data } = notification;

    if (data.type == "reminder-received") {
        return (
            <div className=" p-4 rounded-md">
                <h3 className="text-xl font-bold mb-2">
                    Reminder for note #{data.payload.noteId}
                </h3>
            </div>
        );
    }

    return null;
};
