import {
    GetPeriodicTasksMessage,
    GetPeriodicTasksResponse,
    SettingsFrontendMessage,
} from "$workers/websocket/api/settings/messages.ts";
import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import { getAllPeriodicTasks } from "$backend/repository/periodic-task-repository.ts";
import { CanManagePeriodicTasks } from "$backend/rbac/permissions.ts";

const handleGetPeriodicTasks: ListenerFn<GetPeriodicTasksMessage> = async (
    { respond, sourceClient },
) => {
    sourceClient!.auth.require(CanManagePeriodicTasks.View);

    respond<GetPeriodicTasksResponse>({
        type: "getPeriodicTasksResponse",
        tasks: await getAllPeriodicTasks(),
    });
};

export const frontendMap: RegisterListenerMap<SettingsFrontendMessage> = {
    getPeriodicTasks: handleGetPeriodicTasks,
};
