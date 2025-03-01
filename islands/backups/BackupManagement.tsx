import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteBackupTargetMessage,
    DeleteBackupTargetResponse,
    GetBackupTargetsMessage,
    GetBackupTargetsResponse,
    SettingsFrontendResponse,
} from "$workers/websocket/api/settings/messages.ts";
import Button from "$components/Button.tsx";
import Table from "$components/Table.tsx";
import TimeAgo from "$components/TimeAgo.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { useEffect } from "preact/hooks";
import { BackupTargetRecord } from "$db";
import { getCurrentUnixTimestamp } from "$lib/time/unix.ts";
import { EditTargetBackupRecord } from "./ManageBackupTargetDialog.tsx";
import ManageBackupTargetDialog from "./ManageBackupTargetDialog.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import Icon from "$components/Icon.tsx";

interface BackupManagementProps {
    maxBackupCount: number;
}

const BackupManagement = () => {
    const backupTargets = useSignal<BackupTargetRecord[]>([]);
    const backupTargetLoader = useLoader(true);
    const deleteTargetLoader = useLoader();

    const backupToEdit = useSelected<EditTargetBackupRecord>();
    const backupToDelete = useSelected<BackupTargetRecord>();

    const { sendMessage } = useWebsocketService<
        SettingsFrontendResponse
    >({
        eventMap: {
            settings: {
                createBackupNowResponse: (message) => {
                    if (message.result.success === false) {
                        return;
                    }

                    const result = message.result;

                    backupTargets.value = backupTargets.value.map((target) => {
                        if (target.id === result.target_id) {
                            return {
                                ...target,
                                last_backup_at: getCurrentUnixTimestamp(),
                            };
                        }

                        return target;
                    });
                },
                updateBackupTargetResponse: (message) => {
                    backupTargets.value = backupTargets.value.map((target) => {
                        if (target.id === message.target_id) {
                            return {
                                ...target,
                                name: message.data.name,
                                type: message.data.type,
                                settings: message.data
                                    .settings as BackupTargetRecord["settings"],
                                updated_at: getCurrentUnixTimestamp(),
                            };
                        }

                        return target;
                    });
                },
                createBackupTargetResponse: () => {
                    loadTargets();
                },
                deleteBackupTargetResponse: () => {
                    loadTargets();
                },
            },
        },
    });

    const handleManage = (record: BackupTargetRecord) => {
        backupToEdit.select(structuredClone(record));
    };

    const handleDeleteSelected = deleteTargetLoader.wrap(async () => {
        await sendMessage<
            DeleteBackupTargetMessage,
            DeleteBackupTargetResponse
        >("settings", "deleteBackupTarget", {
            data: {
                target_id: backupToDelete.selected.value!.id,
            },
            expect: "deleteBackupTargetResponse",
        });

        backupToDelete.unselect();
    });

    const handleCreateNewTarget = () => {
        backupToEdit.select({
            id: null,
            name: "",
            type: "local",
            settings: {
                location: "",
            },
        });
    };

    const loadTargets = backupTargetLoader.wrap(async () => {
        const response = await sendMessage<
            GetBackupTargetsMessage,
            GetBackupTargetsResponse
        >("settings", "getBackupTargets", {
            expect: "getBackupTargetsResponse",
        });

        backupTargets.value = response.targets;
    });

    useEffect(() => {
        loadTargets();
    }, []);

    return (
        <div>
            <h1 class="text-xl mb-4 font-semibold">Backup Targets</h1>

            <div class="py-2">
                Backup targets are used to specify where the backups should be
                stored. Backups are ran automatically every day at midnight by
                {" "}
                <a href="/app/settings/periodic-tasks" class="underline">
                    periodic tasks
                </a>. Every backup run goes through all of the targets and
                stores a backup in each of them.

                <br />
                <br />
                Status of each backup target with available backups to download
                can be seen in the Backup List when managing a specific backup.
            </div>

            {!backupTargetLoader.running && (
                <div class="py-2">
                    <Button onClick={handleCreateNewTarget}>
                        Create new target
                    </Button>
                </div>
            )}

            <Table<BackupTargetRecord>
                isLoading={backupTargetLoader.running}
                noRowsRow={
                    <tr>
                        <td colSpan={6} class="text-center">
                            No backup targets specified.
                        </td>
                    </tr>
                }
                columns={[
                    {
                        name: "Name",
                        key: "name",
                    },
                    {
                        name: "Type",
                        render: (record) =>
                            record.type === "local" ? "Local" : "AWS S3 Bucket",
                    },
                    {
                        name: "Created at",
                        render: (record) => (
                            <TimeAgo
                                time={record.created_at}
                            />
                        ),
                    },
                    {
                        name: "Last update at",
                        render: (record) => (
                            <TimeAgo
                                time={record.updated_at}
                            />
                        ),
                    },
                    {
                        name: "Last successful backup at",
                        render: (record) => (
                            <TimeAgo
                                time={record.last_backup_at}
                            />
                        ),
                    },

                    {
                        name: "Actions",
                        headerCellProps: {
                            class: "w-1/6",
                        },
                        render: (record) => (
                            <div>
                                <Button
                                    color="success"
                                    title="Manage"
                                    onClick={() => handleManage(record)}
                                    addClass="mr-2 mb-2"
                                >
                                    <Icon name="cog" />
                                </Button>
                                <Button
                                    color="danger"
                                    title="Delete"
                                    onClick={() =>
                                        backupToDelete.select(record)}
                                >
                                    <Icon name="minus-circle" />
                                </Button>
                            </div>
                        ),
                    },
                ]}
                rows={backupTargets.value}
                headerRowProps={{
                    class: "text-left",
                }}
            />
            {backupToEdit.isSelected() && (
                <ManageBackupTargetDialog
                    initialRecord={backupToEdit.selected.value!}
                    onClose={() => backupToEdit.unselect()}
                />
            )}
            {backupToDelete.isSelected() && (
                <ConfirmDialog
                    prompt="Are you sure you want to delete this backup target?"
                    isProcessing={deleteTargetLoader.running}
                    visible
                    confirmColor="danger"
                    onConfirm={handleDeleteSelected}
                    onCancel={() => backupToDelete.unselect()}
                />
            )}
        </div>
    );
};

export default function BackupManagementContainer({
    maxBackupCount,
}: BackupManagementProps) {
    if (maxBackupCount === 0) {
        return (
            <div>
                <h1 class="text-xl mb-4 font-semibold">Backup Management</h1>
                <p>
                    Backups are disabled by MAX_ALLOWED_BACKUP_COUNT environment
                    variable. To use this page, enable backups from the
                    environment variables by setting it to a value greater than
                    0.
                </p>
            </div>
        );
    }

    return <BackupManagement />;
}
