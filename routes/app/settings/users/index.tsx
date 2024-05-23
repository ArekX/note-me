import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import UserList from "$islands/users/UserList.tsx";
import { AppState } from "$types";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";

export const handler: Handlers<string> = {
    GET: guardHandler(
        CanManageUsers.List,
        (_req, ctx: FreshContext<AppState>) => {
            return ctx.render({});
        },
    ),
};

export default function Page(props: PageProps<never, AppState>) {
    return (
        <div>
            <UserList />
        </div>
    );
}
