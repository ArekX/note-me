import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { updateGroup } from "$backend/repository/group-repository.ts";
import { UpdateGroupRequest } from "$schemas/groups.ts";
import { validateRequest } from "$schemas/mod.ts";
import { updateGroupRequestSchema } from "$schemas/groups.ts";

export const handleUpdateGroup = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const body: UpdateGroupRequest = await (req.json());

    const { id: userId = -1 } = ctx.state.session?.data.user ?? {};

    await validateRequest(updateGroupRequestSchema, body);

    const result = await updateGroup(userId, {
        id: +ctx.params.id,
        ...body,
    });

    return new Response(
        JSON.stringify({
            success: result,
        }),
        {
            status: 200,
        },
    );
};
