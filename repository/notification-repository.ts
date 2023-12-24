import { db } from "$backend/database.ts";
import { NotificationTable } from "$types/tables.ts";
import { Payload } from "$types/payload.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";

export interface NoteReminder {
  noteId: number;
}

export type NotificationDataTypes = Payload<"reminder-received", NoteReminder>;

type NotificationId = { id: number };
type ParsedNotificationData = { data: NotificationDataTypes };
export type NotificationRecord =
  & Omit<NotificationTable, "data" | "id" | "is_deleted">
  & NotificationId
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
