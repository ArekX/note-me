import { guardHandler } from "$backend/rbac/authorizer.ts";
import { toUpdated } from "$backend/api-responses.ts";
import { validateRequest } from "$schemas/mod.ts";
import { updateTagSchema } from "$schemas/tags.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import { updateTagRecord } from "$backend/repository/note-tags-repository.ts";
import { UpdateTagRequest } from "$schemas/tags.ts";
import { UpdateTagData } from "$backend/repository/note-tags-repository.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";

export const handleUpdateTag = guardHandler(CanManageTags.Create, async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const data = await req.json() as UpdateTagRequest;

    await validateRequest(updateTagSchema, data);

    const tagId = +ctx.params.id;

    return toUpdated(await updateTagRecord(tagId, data as UpdateTagData));
});
