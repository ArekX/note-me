import { db } from "$backend/database.ts";
import { NotificationTable, Payload, RecordId } from "$types";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";

export interface NoteReminderData {
    id: number;
    reminder_id: number;
    title: string;
    is_encrypted: boolean;
    user_id: number;
    user_name: string;
    type: "own" | "shared";
}

export interface NoteSharedData {
    id: number;
    title: string;
    user_name: string;
}

export type NotificationDataTypes =
    | Payload<"reminder-received", NoteReminderData>
    | Payload<"note-shared", NoteSharedData>;

type ParsedNotificationData = { data: NotificationDataTypes };

export type NotificationRecord =
    & Omit<NotificationTable, "data" | "id" | "is_deleted">
    & RecordId
    & ParsedNotificationData;

export const getUserNotifications = async (
    userId: number,
): Promise<NotificationRecord[]> => {
    const results = await db.selectFrom("notification")
        .where("is_deleted", "=", false)
        .where("user_id", "=", userId)
        .select(["id", "data", "created_at", "is_read"])
        .execute();

    return results.map((row) => ({
        ...row,
        data: JSON.parse(row.data) as NotificationDataTypes,
    } as NotificationRecord));
};

export type NewNotification = Omit<
    NotificationRecord,
    "id" | "created_at" | "is_read"
>;

export const createNotification = async (
    notification: NewNotification,
): Promise<NotificationRecord> => {
    const record = {
        ...notification,
        data: JSON.stringify(notification.data),
        created_at: getCurrentUnixTimestamp(),
        is_read: false,
        is_deleted: false,
    };
    const result = await db.insertInto("notification")
        .values(record)
        .executeTakeFirstOrThrow();

    return {
        id: Number(result.insertId),
        data: notification.data,
        is_read: record.is_read,
        user_id: record.user_id,
        created_at: record.created_at,
    };
};

export const deleteUserNotifications = async (
    userId: number,
): Promise<boolean> => {
    const results = await db.updateTable("notification")
        .set({ is_deleted: true })
        .where("user_id", "=", userId)
        .executeTakeFirst();

    return results.numUpdatedRows > 0;
};

export const deleteSingleNotification = async (
    id: number,
    userId: number,
): Promise<boolean> => {
    const results = await db.updateTable("notification")
        .set({ is_deleted: true })
        .where("user_id", "=", userId)
        .where("id", "=", id)
        .executeTakeFirst();

    return results.numUpdatedRows > 0;
};

export const markReadUserNotifications = async (
    userId: number,
): Promise<boolean> => {
    const results = await db.updateTable("notification")
        .set({ is_read: true })
        .where("user_id", "=", userId)
        .executeTakeFirst();

    return results.numUpdatedRows > 0;
};

export const markSingleNotificationRead = async (
    id: number,
    userId: number,
): Promise<boolean> => {
    const results = await db.updateTable("notification")
        .set({ is_read: true })
        .where("user_id", "=", userId)
        .where("id", "=", id)
        .executeTakeFirst();

    return results.numUpdatedRows > 0;
};
