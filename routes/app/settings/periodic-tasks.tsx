import { FreshContext, page } from "fresh";
import { AppState } from "$types";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { CanManagePeriodicTasks } from "$backend/rbac/permissions.ts";
import PeriodicTaskList from "$islands/periodic-tasks/PeriodicTaskList.tsx";
import { Handlers } from "fresh/compat";

export const handler: Handlers = {
    GET: guardHandler(
        CanManagePeriodicTasks.View,
        (_ctx: FreshContext<AppState>) => {
            return page({});
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
