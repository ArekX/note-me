import { useLoader } from "$frontend/hooks/use-loader.ts";
import { PeriodicTaskRecord } from "../../workers/database/query/periodic-task-repository.ts";
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
            <div class="py-4">
                This screen allows you to see the status of all background
                periodic tasks running in the application along with their last
                reported status.
            </div>
            <Table<PeriodicTaskRecord>
                isLoading={tasksLoader.running}
                noRowsRow={
                    <tr>
                        <td colSpan={6}>No periodic tasks found</td>
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
                                        class={`${
                                            record.is_last_run_successful
                                                ? "text-green-400 bg-green-900 border-green-700/50"
                                                : "text-red-400 bg-red-900 border-red-700/50"
                                        } inline-block px-2 py-1 rounded-lg border max-md:text-center`}
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
