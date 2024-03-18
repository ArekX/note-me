import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { updateGroup } from "$backend/repository/group-repository.ts";
import { UpdateGroupRequest } from "$schemas/groups.ts";
import { validateRequest } from "$schemas/mod.ts";
import { updateGroupRequestSchema } from "$schemas/groups.ts";
import { toUpdated } from "$backend/api-responses.ts";

export const handleUpdateGroup = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const body: UpdateGroupRequest = await (req.json());

    const userId = ctx.state.session?.getUserId()!;

    await validateRequest(updateGroupRequestSchema, body);

    const result = await updateGroup(userId, {
        id: +ctx.params.id,
        ...body,
    });

    return toUpdated(result);
};
