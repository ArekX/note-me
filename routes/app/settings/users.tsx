import { FreshContext, page } from "fresh";
import UserList from "$islands/users/UserList.tsx";
import { AppState } from "$types";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
    GET: guardHandler(
        CanManageUsers.Update,
        (_ctx: FreshContext<AppState>) => {
            return page({});
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
