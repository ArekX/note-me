import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { NoteReminderTable } from "$types";
import {
    dateToUnix,
    getCurrentUnixTimestamp,
    unixToDate,
} from "$lib/time/unix.ts";
import { RecordId } from "$types";

type Reminder = {
    type: "once";
    next_at: number;
} | {
    type: "repeat";
    interval: number;
    unit_value: number;
    repeat_count: number;
};

export interface SetReminderData {
    note_id: number;
    user_id: number;
    reminder: Reminder;
}

export type SetReminderResult = Pick<
    NoteReminderTable,
    "next_at" | "interval" | "repeat_count" | "unit_value"
>;

export const setReminder = async ({
    note_id,
    user_id,
    reminder,
}: SetReminderData): Promise<SetReminderResult> => {
    let nextAt = reminder.type === "once"
        ? reminder.next_at
        : getCurrentUnixTimestamp() +
            reminder.interval * reminder.unit_value;

    const date = unixToDate(nextAt);
    date.setSeconds(0);
    date.setMilliseconds(0);
    nextAt = dateToUnix(date);

    const data: SetReminderResult = {
        next_at: nextAt,
        interval: reminder.type === "repeat" ? reminder.interval : null,
        unit_value: reminder.type === "repeat" ? reminder.unit_value : null,
        repeat_count: reminder.type === "repeat" ? reminder.repeat_count : 0,
    };

    const existingReminder = await db.selectFrom("note_reminder")
        .select(["id"])
        .where("note_id", "=", note_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    if (existingReminder) {
        await db.updateTable("note_reminder")
            .set(data)
            .where("id", "=", existingReminder.id)
            .execute();

        return data;
    }

    await db.insertInto("note_reminder")
        .values({
            note_id,
            user_id,
            done_count: 0,
            ...data,
        })
        .execute();

    return data;
};

export const removeReminder = async (note_id: number, user_id: number) => {
    await db.deleteFrom("note_reminder")
        .where("note_id", "=", note_id)
        .where("user_id", "=", user_id)
        .execute();
};

export interface ReminderNoteRecord extends
    Pick<
        NoteReminderTable,
        | "note_id"
        | "done_count"
        | "interval"
        | "unit_value"
        | "repeat_count"
        | "next_at"
    > {
    id: number;
    title: string;
    is_encrypted: boolean;
    author_id: number;
    author_name: string;
    type: "once" | "repeat";
}

export interface UserReminderNotesFilters {
    fromNextAt?: number;
    fromId?: number;
    limit?: number;
}

export const findUserReminderNotes = async (
    filters: UserReminderNotesFilters,
    user_id: number,
): Promise<ReminderNoteRecord[]> => {
    return await db.selectFrom("note_reminder")
        .innerJoin("note", "note.id", "note_reminder.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .select([
            "note_reminder.id",
            "note_reminder.note_id",
            "note.title",
            "note.is_encrypted",
            sql<number>`note.user_id`.as("author_id"),
            sql<string>`user.name`.as("author_name"),
            sql<
                "once" | "repeat"
            >`(CASE WHEN note_reminder.interval IS NULL THEN 'once' ELSE 'repeat' END)`
                .as("type"),
            "note_reminder.done_count",
            "note_reminder.interval",
            "note_reminder.unit_value",
            "note_reminder.repeat_count",
            "note_reminder.next_at",
        ])
        .where("note_reminder.user_id", "=", user_id)
        .where("note.is_deleted", "=", false)
        .where((e) =>
            e.or([
                e("note_reminder.next_at", ">", filters.fromNextAt ?? 0),
                e.and([
                    e("note_reminder.next_at", "=", filters.fromNextAt ?? 0),
                    e("note_reminder.id", ">", filters.fromId ?? 0),
                ]),
            ])
        )
        .orderBy("note_reminder.next_at", "asc")
        .orderBy("note_reminder.id", "asc")
        .limit(Math.min(filters.limit ?? 10, 10))
        .execute();
};

export type NoteReminderData =
    & Pick<
        NoteReminderTable,
        | "next_at"
        | "interval"
        | "unit_value"
        | "repeat_count"
        | "done_count"
    >
    & RecordId;

export const getNoteReminderData = async (
    note_id: number,
    user_id: number,
): Promise<NoteReminderData | null> => {
    return await db.selectFrom("note_reminder")
        .select([
            "id",
            "next_at",
            "interval",
            "unit_value",
            "repeat_count",
            "done_count",
        ])
        .where("note_id", "=", note_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst() ?? null;
};

export type ReadyReminder =
    & Pick<NoteReminderTable, "note_id" | "user_id">
    & RecordId;

export const getReadyReminders = async (): Promise<ReadyReminder[]> => {
    return await db.selectFrom("note_reminder")
        .select([
            "id",
            "note_id",
            "user_id",
        ])
        .where("next_at", "<=", getCurrentUnixTimestamp())
        .execute();
};

export const resolveReminderNextOcurrence = async (
    id: number,
) => {
    const reminder = await db.selectFrom("note_reminder")
        .select([
            "done_count",
            "interval",
            "unit_value",
            "repeat_count",
            "next_at",
        ])
        .where("id", "=", id)
        .executeTakeFirst();

    if (!reminder) {
        return;
    }

    const newDoneCount = reminder.done_count + 1;

    if (newDoneCount >= (reminder.repeat_count ?? 0)) {
        await db.deleteFrom("note_reminder").where("id", "=", id).execute();
        return;
    }

    const nextAt = reminder.interval
        ? getCurrentUnixTimestamp() +
            (reminder.interval ?? 0) * (reminder.unit_value ?? 0)
        : reminder.next_at;

    await db.updateTable("note_reminder")
        .set({
            done_count: newDoneCount,
            next_at: nextAt,
        })
        .where("id", "=", id)
        .execute();
};
