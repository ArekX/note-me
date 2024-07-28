import { FreshContext, Handlers } from "$fresh/server.ts";
import UserList from "$islands/users/UserList.tsx";
import { AppState } from "$types";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";

export const handler: Handlers<string> = {
    GET: guardHandler(
        CanManageUsers.Update,
        (_req, ctx: FreshContext<AppState>) => {
            return ctx.render({});
        },
    ),
};

export default function Page() {
    return (
        <div>
            <UserList />
        </div>
    );
}
