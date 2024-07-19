import { FreshContext, Handlers } from "$fresh/server.ts";
import { AppState } from "$types";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { CanManagePeriodicTasks } from "$backend/rbac/permissions.ts";
import PeriodicTaskList from "$islands/periodic-tasks/PeriodicTaskList.tsx";

export const handler: Handlers<string> = {
    GET: guardHandler(
        CanManagePeriodicTasks.View,
        (_req, ctx: FreshContext<AppState>) => {
            return ctx.render({});
        },
    ),
};

export default function Page() {
    return (
        <div>
            <PeriodicTaskList />
        </div>
    );
}
