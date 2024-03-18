import { guardHandler } from "$backend/rbac/authorizer.ts";
import { toDeleted } from "$backend/api-responses.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import { deleteTagRecord } from "$backend/repository/note-tags-repository.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const handleDeleteTag = guardHandler(CanManageTags.Delete, async (
    _req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const tagId = +ctx.params.id;

    await deleteTagRecord(tagId);

    return toDeleted();
});
