import { UpdateUserData } from "$backend/repository/user-repository.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { UpdateUserRequest, updateUserSchema } from "$schemas/users.ts";
import { validateRequest } from "$schemas/mod.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { updateUserRecord } from "$backend/repository/user-repository.ts";
import { toUpdated } from "$backend/api-responses.ts";

export const handleUpdateUser = guardHandler(CanManageUsers.Update, async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const data = await req.json() as UpdateUserRequest;

    const sessionUserId = ctx.state.session?.getUserId()!;
    const userId = +ctx.params.id;

    const schema = updateUserSchema.refine(
        (data) => !data.role || userId != sessionUserId,
        {
            message: "You cannot change your own role.",
            path: ["role"],
        },
    );

    await validateRequest(schema, data);

    return toUpdated(await updateUserRecord(userId, data as UpdateUserData));
});
