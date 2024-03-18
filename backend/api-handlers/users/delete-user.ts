import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { toDeleted } from "$backend/api-responses.ts";
import { deleteUserRecord } from "$backend/repository/user-repository.ts";
import { destroySession } from "$backend/session/mod.ts";

export const handleDeleteUser = guardHandler(CanManageUsers.Delete, async (
    _req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const sessionUserId = ctx.state.session?.getUserId()!;
    const userId = +ctx.params.id;

    if (userId === sessionUserId) {
        throw new Deno.errors.InvalidData("You cannot delete your own user.");
    }

    await destroySession(userId);
    await deleteUserRecord(userId);

    return toDeleted();
});
