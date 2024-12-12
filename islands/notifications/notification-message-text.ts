import {
    NotificationRecord,
} from "../../workers/database/query/notification-repository.ts";

export const getNotificationMessageText = (record: NotificationRecord) => {
    switch (record.data.type) {
        case "reminder-received":
            return `You have a reminder for note "${record.data.payload.title}" from ${record.data.payload.user_name}`;
        case "note-shared":
            return `Note "${record.data.payload.title}" has been shared with you by ${record.data.payload.user_name}`;
    }
};
