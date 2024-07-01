import { NoteSharedData } from "$backend/repository/notification-repository.ts";
import {
    NotificationViewProps,
} from "$islands/notifications/NotificationItem.tsx";

export default function NotificationSharedView({
    data,
}: NotificationViewProps<NoteSharedData>) {
    return (
        <div className=" p-4 rounded-md">
            <h3 className="text-sm font-bold mb-2">
                Note "{data.title}" has been shared with you by{" "}
                {data.user_name}.
            </h3>
        </div>
    );
}
