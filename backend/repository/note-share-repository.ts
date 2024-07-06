import { NoteShareLinkTable, RecordId } from "$types";
import {
    beginTransaction,
    commitTransaction,
    db,
    rollbackTransaction,
} from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { PickUserRecord } from "$backend/repository/user-repository.ts";
import { getNoteTagsSql } from "$backend/repository/note-repository.ts";
import { sql } from "$lib/kysely-sqlite-dialect/deps.ts";
import { Paged, pageResults } from "$lib/kysely-sqlite-dialect/pagination.ts";
import { applyFilters } from "$lib/kysely-sqlite-dialect/filters.ts";

export type PublicShareData = Pick<
    NoteShareLinkTable,
    "note_id" | "expires_at"
>;

export type PublicNoteShareRecord =
    & Pick<
        NoteShareLinkTable,
        | "note_id"
        | "identifier"
        | "created_at"
        | "expires_at"
    >
    & RecordId;

export interface PublicSharedNote {
    id: number;
    title: string;
    note: string;
    tags: string[];
    updated_at: number;
    user_name: string;
}

export const getPublicShareNote = async (
    identifier: string,
): Promise<PublicSharedNote | null> => {
    const result = await db.selectFrom("note_share_link")
        .where("identifier", "=", identifier)
        .where((w) =>
            w.or([
                w("expires_at", "is", null),
                w("expires_at", ">", getCurrentUnixTimestamp()),
            ])
        )
        .innerJoin("note", "note.id", "note_share_link.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .select([
            "note.id",
            "note.title",
            "note.note",
            "note.updated_at",
            getNoteTagsSql().as("tags"),
            sql<string>`user.name`.as("user_name"),
        ])
        .executeTakeFirst() ?? null;

    return result
        ? {
            ...result,
            tags: result.tags?.split(",") ?? [],
        }
        : null;
};

export const getUserShareNote = async (
    note_id: number,
    user_id: number,
): Promise<PublicSharedNote | null> => {
    const result = await db.selectFrom("note_share_user")
        .innerJoin("note", "note.id", "note_share_user.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .where("note_share_user.note_id", "=", note_id)
        .where("note_share_user.user_id", "=", user_id)
        .select([
            "note.id",
            "note.title",
            "note.note",
            "note.updated_at",
            getNoteTagsSql().as("tags"),
            sql<string>`user.name`.as("user_name"),
        ])
        .executeTakeFirst();

    return result
        ? {
            ...result,
            tags: result.tags?.split(",") ?? [],
        }
        : null;
};

export const createPublicShare = async ({
    note_id,
    expires_at,
}: PublicShareData): Promise<PublicNoteShareRecord> => {
    const record:
        & Pick<NoteShareLinkTable, "identifier" | "created_at">
        & PublicShareData = {
            note_id,
            identifier: crypto.randomUUID(),
            created_at: getCurrentUnixTimestamp(),
            expires_at,
        };

    const result = await db.insertInto("note_share_link")
        .values(record)
        .executeTakeFirst();

    return {
        id: Number(result.insertId),
        ...record,
    };
};

export const removePublicShare = async (
    id: number,
): Promise<void> => {
    await db.deleteFrom("note_share_link")
        .where("id", "=", id)
        .execute();
};

interface UserShareData {
    note_id: number;
    user_ids: number[];
}

export const setUserShare = async ({
    note_id,
    user_ids,
}: UserShareData): Promise<{ shared_to_user_ids: number[] }> => {
    const existingIds = (await db.selectFrom("note_share_user")
        .select("user_id")
        .where("note_id", "=", note_id)
        .execute())
        .map((record) => record.user_id);

    const toInsert = user_ids.filter((id) => !existingIds.includes(id));
    const toDelete = existingIds.filter((id) => !user_ids.includes(id));

    if (toInsert.length === 0 && toDelete.length === 0) {
        return { shared_to_user_ids: [] };
    }

    await beginTransaction();
    try {
        if (toInsert.length > 0) {
            await db.insertInto("note_share_user")
                .values(toInsert.map((user_id) => ({
                    note_id,
                    user_id,
                    created_at: getCurrentUnixTimestamp(),
                })))
                .execute();
        }

        if (toDelete.length > 0) {
            await db.deleteFrom("note_share_user")
                .where("note_id", "=", note_id)
                .where("user_id", "in", toDelete)
                .execute();
        }
        await commitTransaction();

        return { shared_to_user_ids: toInsert };
    } catch (e) {
        await rollbackTransaction();
        throw e;
    }
};

export interface NoteShareData {
    users: PickUserRecord[];
    links: PublicNoteShareRecord[];
}

export const getNoteShareData = async (
    note_id: number,
): Promise<NoteShareData> => {
    const users: PickUserRecord[] = await db.selectFrom("note_share_user")
        .innerJoin("user", "user.id", "note_share_user.user_id")
        .select([
            "user.id",
            "user.name",
            "user.username",
        ])
        .where("note_id", "=", note_id)
        .execute();

    const links: PublicNoteShareRecord[] = await db.selectFrom(
        "note_share_link",
    )
        .select([
            "id",
            "note_id",
            "identifier",
            "created_at",
            "expires_at",
        ])
        .where("note_id", "=", note_id)
        .orderBy("created_at", "desc")
        .execute();

    return {
        users,
        links,
    };
};

export interface UserSharedNoteMeta {
    id: number;
    title: string;
    user_name: string;
}

export interface FindUserSharedNotesFilters {
    title?: string;
}

export const findUserSharedNotes = async (
    filters: FindUserSharedNotesFilters,
    user_id: number,
    page: number,
): Promise<Paged<PublicSharedNote>> => {
    let query = db.selectFrom("note_share_user")
        .innerJoin("note", "note.id", "note_share_user.note_id")
        .innerJoin("user", "user.id", "note.user_id")
        .select([
            "note.id",
            "note.title",
            sql<string>`user.name`.as("user_name"),
        ])
        .where("note_share_user.user_id", "=", user_id)
        .orderBy("note_share_user.created_at", "desc");

    query = applyFilters(query, [
        { field: "note.title", type: "text", value: filters.title },
    ]);

    return await pageResults(query, page);
};

export const removeExpiredPublicShares = async (): Promise<void> => {
    await db.deleteFrom("note_share_link")
        .where("expires_at", "<", getCurrentUnixTimestamp())
        .execute();
};

export const sharedNoteWithUser = async (
    note_id: number,
    user_id: number,
): Promise<boolean> => {
    const result = await db.selectFrom("note_share_user")
        .select([
            sql`1`.as("exists"),
        ])
        .where("note_id", "=", note_id)
        .where("user_id", "=", user_id)
        .executeTakeFirst();

    return !!result;
};
