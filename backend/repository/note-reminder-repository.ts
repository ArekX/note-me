import { db } from "$backend/database.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { NoteReminderTable } from "../../types/tables.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { RecordId } from "../../types/repository.ts";

type Reminder = {
    type: "once";
    next_at: number;
} | {
    type: "repeat";
    interval_seconds: number;
    repeat_count: number;
};

export interface SetReminderData {
    note_id: number;
    user_id: number;
    reminder: Reminder;
}

export const setReminder = async ({
    note_id,
    user_id,
    reminder,
}: SetReminderData) => {
    const data: Pick<
        NoteReminderTable,
        "next_at" | "interval_seconds" | "repeat_count"
    > = {
        next_at: reminder.type === "once"
            ? reminder.next_at
            : getCurrentUnixTimestamp() + reminder.interval_seconds,
        interval_seconds: reminder.type === "repeat"
            ? reminder.interval_seconds
            : null,
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

        return;
    }

    await db.insertInto("note_reminder")
        .values({
            note_id,
            user_id,
            done_count: 0,
            ...data,
        })
        .execute();
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
        | "id"
        | "note_id"
        | "done_count"
        | "interval_seconds"
        | "repeat_count"
        | "next_at"
    > {
    title: string;
    author_id: number;
    author_name: string;
    type: "once" | "repeat";
}

export interface UserReminderNotesFilters {
    search: string;
}

export const findUserReminderNotes = async (
    filters: UserReminderNotesFilters,
    page: number,
    user_id: number,
): Promise<Paged<ReminderNoteRecord>> => {
    let query = db.selectFrom("note_reminder")
        .innerJoin("note", "note.id", "note_reminder.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .select([
            "note_reminder.id",
            "note_reminder.note_id",
            "note.title",
            sql<number>`note.user_id`.as("author_id"),
            sql<string>`user.name`.as("author_name"),
            sql<string>`(CASE WHEN note_reminder.interval_seconds IS NULL THEN 'once' ELSE 'repeat' END)`
                .as("type"),
            "note_reminder.done_count",
            "note_reminder.interval_seconds",
            "note_reminder.repeat_count",
            "note_reminder.next_at",
        ])
        .where("note_reminder.user_id", "=", user_id);

    query = applyFilters(query, [
        { field: "note.title", type: "text", value: filters.search },
    ]);

    return await pageResults(query, page);
};

export type NoteReminderData =
    & Pick<
        NoteReminderTable,
        | "next_at"
        | "interval_seconds"
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
            "interval_seconds",
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
        .select(["done_count", "interval_seconds", "repeat_count", "next_at"])
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

    const nextAt = reminder.interval_seconds
        ? getCurrentUnixTimestamp() +
            (reminder.interval_seconds ?? 0)
        : reminder.next_at;

    await db.updateTable("note_reminder")
        .set({
            done_count: newDoneCount,
            next_at: nextAt,
        })
        .where("id", "=", id)
        .execute();
};
