import { NoteSharedData } from "$db";
import {
    NotificationViewProps,
} from "$islands/notifications/NotificationItem.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";
import Button from "$components/Button.tsx";
import { closeAllPopovers } from "$frontend/hooks/use-single-popover.ts";

export default function NotificationSharedView({
    data,
}: NotificationViewProps<NoteSharedData>) {
    const handleOpenNote = () => {
        redirectTo.viewSharedNote({
            noteId: data.id,
        });
        closeAllPopovers();
    };

    return (
        <div className="p-4 rounded-md">
            <h3 className="text-sm font-bold mb-2">
                Note "{data.title}" has been shared with you by{" "}
                {data.user_name}.
            </h3>
            <div>
                <Button color="success" size="xs" onClick={handleOpenNote}>
                    View
                </Button>
            </div>
        </div>
    );
}
