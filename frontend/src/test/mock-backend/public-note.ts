import { ApiError } from "@/lib/api";
import type { PublicSharedNote } from "@/types/records";
import type { MockState } from "./state";

// Mock of GET /api/public/{identifier} with the server's statuses and texts.
export const mockPublicNote = (
    state: MockState,
    identifier: string,
): PublicSharedNote => {
    const link = state.linkShares.find(
        (l) =>
            l.identifier === identifier &&
            (l.expires_at === null || l.expires_at > Date.now() / 1000),
    );
    const note = state.notes.find(
        (n) => n.id === link?.note_id && !n.is_deleted,
    );
    if (!note) {
        throw new ApiError(404, "Note not found.");
    }
    if (note.is_encrypted) {
        throw new ApiError(
            403,
            "This note is protected by its owner and cannot be viewed.",
        );
    }
    return {
        id: note.id,
        title: note.title,
        note: note.note,
        is_encrypted: false,
        is_wide: note.is_wide ?? true,
        tags: note.tags,
        updated_at: note.updated_at,
        user_name:
            state.users.find((u) => u.id === note.user_id)?.name ?? "Unknown",
    };
};
