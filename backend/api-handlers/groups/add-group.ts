import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { createGroup } from "$backend/repository/group-repository.ts";
import { validateRequest } from "$schemas/mod.ts";
import { AddGroupRequest } from "$schemas/groups.ts";
import { addGroupRequestSchema } from "$schemas/groups.ts";
import { toCreated } from "$backend/api-responses.ts";

export const handleAddGroup = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const body: AddGroupRequest = await (req.json());

    const userId = ctx.state.session?.getUserId()!;

    await validateRequest(addGroupRequestSchema, body);

    const result = await createGroup({
        ...body,
        user_id: userId,
    });

    return toCreated(result);
};
