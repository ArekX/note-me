import type { RouteLocationRaw } from "vue-router";

export const redirectTo = {
    root: (): RouteLocationRaw => ({ name: "dashboard" }),
    newNote: ({ groupId }: { groupId?: number | null } = {}) =>
        ({
            name: "note-new",
            query: groupId ? { group_id: groupId } : {},
        }) satisfies RouteLocationRaw,
    viewNote: ({ noteId }: { noteId: number }) =>
        ({
            name: "note-view",
            params: { id: noteId },
        }) satisfies RouteLocationRaw,
    viewSharedNote: ({ noteId }: { noteId: number }) =>
        ({
            name: "note-shared",
            params: { id: noteId },
        }) satisfies RouteLocationRaw,
    editNote: ({ noteId }: { noteId: number }) =>
        ({
            name: "note-edit",
            params: { id: noteId },
        }) satisfies RouteLocationRaw,
};

// Browsers read "/\host" as "//host", so a leading "/" alone does not keep
// the target on this site.
export const sameSitePath = (value: unknown): string | null => {
    if (typeof value !== "string" || !value.startsWith("/")) {
        return null;
    }
    const url = new URL(value, location.origin);
    return url.origin === location.origin
        ? url.pathname + url.search + url.hash
        : null;
};
