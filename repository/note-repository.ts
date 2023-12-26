import { NoteTable } from "$types";
import { db } from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";

type NoteId = { id: number };

export type NewNote = Omit<NoteTable, "id" | "created_at" | "updated_at">;
export type NoteRecord = Omit<NoteTable, "id"> & NoteId;

export const createNote = async (note: NewNote): Promise<NoteRecord> => {
  const newRecord = {
    ...note,
    created_at: getCurrentUnixTimestamp(),
    updated_at: getCurrentUnixTimestamp(),
  };

  const result = await db.insertInto("note")
    .values(newRecord)
    .executeTakeFirst();

  if (!result) {
    throw new Error("Could not create note!");
  }

  return {
    id: Number(result.insertId),
    ...newRecord,
  };
};

export interface NoteFilters {
  user_id: number;
}

export const listNotes = async (filter: NoteFilters): Promise<NoteRecord[]> => {
  const results = await db.selectFrom("note")
    .where("user_id", "=", filter.user_id)
    .orderBy("created_at", "desc")
    .select(["id", "note", "created_at", "updated_at", "user_id"])
    .execute();

  return results;
};
