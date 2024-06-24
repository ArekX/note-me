import { NoteShareLinkTable, RecordId } from "$types";
import {
    beginTransaction,
    commitTransaction,
    db,
    rollbackTransaction,
} from "$backend/database.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { PickUserRecord } from "$backend/repository/user-repository.ts";

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
        };

    if (expires_at) {
        record.expires_at = expires_at;
    }

    const result = await db.insertInto("note_share_link")
        .values(record)
        .executeTakeFirst();

    return {
        id: Number(result.insertId),
        ...record,
    };
};

interface UserShareData {
    note_id: number;
    user_ids: number[];
}

export const setUserShare = async ({
    note_id,
    user_ids,
}: UserShareData): Promise<void> => {
    const existingIds = (await db.selectFrom("note_share_user")
        .select("user_id")
        .where("note_id", "=", note_id)
        .where("user_id", "in", user_ids)
        .execute())
        .map((record) => record.user_id);

    const toInsert = user_ids.filter((id) => !existingIds.includes(id));
    const toDelete = existingIds.filter((id) => !user_ids.includes(id));

    if (toInsert.length === 0 && toDelete.length === 0) {
        return;
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
        .execute();

    return {
        users,
        links,
    };
};
