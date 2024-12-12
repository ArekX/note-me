import { db } from "$backend/database.ts";
import { NoteTagTable, RecordId } from "$types";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { when } from "$backend/promise.ts";

export type TagRecord =
    & Pick<
        NoteTagTable,
        "name"
    >
    & RecordId;

export const resolveTags = async (
    user_id: number,
    tags: string[],
): Promise<TagRecord[]> => {
    if (tags.length == 0) {
        return [];
    }

    const uniqueTags = Array.from(
        new Set(tags.map((t) => t.toLowerCase().trim().replace(/ /g, ""))),
    );

    const existingTags = await db.selectFrom("note_tag")
        .select(["id", "name"])
        .where("name", "in", uniqueTags)
        .execute();

    const newRecords = uniqueTags
        .filter((tag) => existingTags.find((r) => r.name === tag) === undefined)
        .map((name) => ({
            name,
            user_id,
            created_at: getCurrentUnixTimestamp(),
        }));

    if (newRecords.length > 0) {
        const results = await db.insertInto("note_tag")
            .values(newRecords)
            .returning("id")
            .execute();

        for (let i = 0; i < results.length; i++) {
            existingTags.push({
                id: Number(results[i].id),
                ...newRecords[i],
            });
        }
    }

    return existingTags;
};

export const linkNoteWithTags = async (
    note_id: number,
    user_id: number,
    tags: string[],
): Promise<boolean> => {
    const tagRecords = await resolveTags(user_id, tags);

    if (tagRecords.length == 0) {
        return true;
    }

    const tagsToAdd: number[] = [];
    const tagsToRemove: number[] = [];

    const insertedIds = (
        await db.selectFrom("note_tag")
            .select([
                "note_tag.id",
            ])
            .innerJoin(
                "note_tag_note",
                (join) =>
                    join
                        .onRef("note_tag.id", "=", "note_tag_note.tag_id")
                        .on("note_tag_note.note_id", "=", note_id),
            )
            .execute()
    ).map((r) => r.id);

    for (const tag of tagRecords) {
        if (!insertedIds.includes(tag.id)) {
            tagsToAdd.push(tag.id);
        }
    }

    for (const id of insertedIds) {
        if (!tagRecords.find((tag) => tag.id === id)) {
            tagsToRemove.push(id);
        }
    }

    await Promise.all([
        when(
            () => tagsToAdd.length > 0,
            () =>
                db.insertInto("note_tag_note")
                    .values(tagsToAdd.map((id) => ({
                        note_id,
                        tag_id: id,
                        created_at: getCurrentUnixTimestamp(),
                    })))
                    .execute(),
        ),
        when(
            () => tagsToRemove.length > 0,
            () =>
                db.deleteFrom("note_tag_note")
                    .where("note_id", "=", note_id)
                    .where("tag_id", "in", tagsToRemove)
                    .execute(),
        ),
    ]);

    return true;
};

export interface FindTagFilters {
    name: string;
}

export const findTags = async (
    filters: FindTagFilters,
    page: number,
): Promise<Paged<TagRecord>> => {
    let query = db.selectFrom("note_tag")
        .select([
            "id",
            "name",
        ]);

    query = applyFilters(query, [
        { field: "name", type: "text", value: filters.name },
    ]);

    return await pageResults(query, page);
};

export type CreateTagData = Pick<NoteTagTable, "name">;

export const createTagRecord = async (
    data: CreateTagData,
    user_id: number,
): Promise<TagRecord> => {
    const tagRecord = {
        name: data.name,
        user_id,
        created_at: getCurrentUnixTimestamp(),
    };
    const result = await db.insertInto("note_tag")
        .values(tagRecord)
        .executeTakeFirst();

    return {
        id: Number(result.insertId!),
        ...tagRecord,
    };
};

export type UpdateTagData = Pick<NoteTagTable, "name">;

export const updateTagRecord = async (
    id: number,
    data: UpdateTagData,
): Promise<boolean> => {
    const result = await db.updateTable("note_tag")
        .set({
            name: data.name,
        })
        .where("id", "=", id)
        .executeTakeFirst();

    return result.numUpdatedRows > 0;
};

export const deleteTagRecord = async (
    id: number,
): Promise<boolean> => {
    await db.deleteFrom("note_tag_note")
        .where("tag_id", "=", id)
        .execute();

    const result = await db.deleteFrom("note_tag")
        .where("id", "=", id)
        .executeTakeFirst();

    return result.numDeletedRows > 0;
};
