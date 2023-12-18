import { NoteTable } from "$types/tables.ts";
import { db } from "$backend/database.ts";

type NoteId = { id: number };

export type NewNote = Omit<NoteTable, "id" | "created_at" | "updated_at">;
export type NoteRecord = Omit<NoteTable, "id"> & NoteId;

export const createNote = async (note: NewNote): Promise<NoteRecord> => {
  const newRecord = {
    ...note,
    created_at: (new Date()).getTime(),
    updated_at: (new Date()).getTime(),
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
