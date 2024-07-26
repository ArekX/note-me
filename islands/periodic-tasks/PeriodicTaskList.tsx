import { useLoader } from "$frontend/hooks/use-loader.ts";
import { PeriodicTaskRecord } from "$backend/repository/periodic-task-repository.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Table from "$components/Table.tsx";
import {
    GetPeriodicTasksMessage,
    GetPeriodicTasksResponse,
} from "$workers/websocket/api/settings/messages.ts";
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import TimeAgo from "$components/TimeAgo.tsx";

export default function PeriodicTaskList() {
    const tasksLoader = useLoader(true);

    const tasks = useSignal<PeriodicTaskRecord[]>([]);

    const { sendMessage } = useWebsocketService();

    const loadTasks = tasksLoader.wrap(async () => {
        const response = await sendMessage<
            GetPeriodicTasksMessage,
            GetPeriodicTasksResponse
        >(
            "settings",
            "getPeriodicTasks",
            {
                data: {},
                expect: "getPeriodicTasksResponse",
            },
        );

        tasks.value = response.tasks;
    });

    useEffect(() => {
        const interval = setInterval(loadTasks, 10000);

        loadTasks();

        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <div class="text-right pt-2 pb-4">
                <Button color="success" onClick={loadTasks}>
                    <Icon name="refresh" /> Refresh
                </Button>
            </div>
            <Table<PeriodicTaskRecord>
                isLoading={tasksLoader.running}
                noRowsRow={
                    <tr>
                        <td colSpan={3}>No periodic tasks found</td>
                    </tr>
                }
                headerRowProps={{
                    class: "text-left",
                }}
                columns={[
                    { name: "Task", key: "task_identifier" },
                    {
                        name: "Next Run At",
                        render: (record) => (
                            <TimeAgo time={record.next_run_at} />
                        ),
                    },
                    {
                        name: "Last run successful?",
                        render: (record) =>
                            record.last_successful_run_at
                                ? (
                                    <div
                                        class={record.is_last_run_successful
                                            ? "text-green-800"
                                            : "text-red-800"}
                                    >
                                        <Icon
                                            name={record.last_successful_run_at
                                                ? "check-circle"
                                                : "times-circle"}
                                        />{" "}
                                        {record.last_successful_run_at
                                            ? "Successful"
                                            : "Failed"}
                                    </div>
                                )
                                : "No runs yet",
                    },
                    {
                        name: "Last successful run at",
                        render: (record) => (
                            <TimeAgo time={record.last_successful_run_at} />
                        ),
                    },
                    {
                        name: "Last failure reason",
                        render: (record) => record.last_fail_reason
                            ? record.last_fail_reason
                            : "N/A",
                    },
                    {
                        name: "Last Fail At",
                        render: (record) => (
                            <TimeAgo time={record.last_fail_run_at} />
                        ),
                    },
                ]}
                rows={tasks.value}
            />
        </div>
    );
}
