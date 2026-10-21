import type {
    DeletedAllResponse,
    DeletedSingleResponse,
    MarkedAllReadResponse,
    MarkedSingleReadResponse,
    NotificationFrontendMessage,
    NotificationListResponse,
} from "@/types/messages";
import type { MockHandlerMap } from "../handler";

export const notificationsHandlers: MockHandlerMap<NotificationFrontendMessage> =
    {
        getMyNotifications: (_m, { state, respond }) =>
            respond<NotificationListResponse>("notificationsList", {
                records: [...state.notifications].sort(
                    (a, b) => b.created_at - a.created_at,
                ),
            }),
        deleteAll: (_m, { state, respond }) => {
            state.notifications = [];
            respond<DeletedAllResponse>("deletedAll");
        },
        markAllRead: (_m, { state, respond }) => {
            state.notifications.forEach((n) => (n.is_read = true));
            respond<MarkedAllReadResponse>("markedAllRead");
        },
        markSingleRead: ({ id }, { state, respond }) => {
            const record = state.notifications.find((n) => n.id === id);
            if (record) {
                record.is_read = true;
            }
            respond<MarkedSingleReadResponse>("markedSingleRead", { id });
        },
        deleteSingle: ({ id }, { state, respond }) => {
            state.notifications = state.notifications.filter(
                (n) => n.id !== id,
            );
            respond<DeletedSingleResponse>("deletedSingle", { id });
        },
    };
