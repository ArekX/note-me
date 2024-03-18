import { guardHandler } from "$backend/rbac/authorizer.ts";
import { toCreated } from "$backend/api-responses.ts";
import { validateRequest } from "$schemas/mod.ts";
import { addTagSchema } from "$schemas/tags.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import {
    CreateTagData,
    createTagRecord,
} from "$backend/repository/note-tags-repository.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { AddTagRequest } from "$schemas/tags.ts";

export const handleAddTag = guardHandler(CanManageTags.Create, async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const data = await req.json() as AddTagRequest;

    const userId = ctx.state.session?.getUserId()!;

    await validateRequest(addTagSchema, data);

    return toCreated(await createTagRecord(data as CreateTagData, userId));
});
