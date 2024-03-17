import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { DeleteGroupRequest, deleteRequestSchema } from "$schemas/groups.ts";
import { validateRequest } from "$schemas/mod.ts";
import { deleteGroup } from "$backend/repository/group-repository.ts";
import { toDeleted } from "$backend/api-responses.ts";

export const handleDeleteGroup = async (
    _req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const body: DeleteGroupRequest = {
        id: +ctx.params.id,
    };

    await validateRequest(deleteRequestSchema, body);

    const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

    await deleteGroup(body.id, userId);

    return toDeleted();
};
