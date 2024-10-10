import { useSignal } from "@preact/signals";
import { BackupItem } from "$lib/backup-handler/mod.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateBackupNowMessage,
    DeleteBackupMessage,
    DeleteBackupResponse,
    GetBackupsMessage,
    GetBackupsResponse,
    SettingsFrontendResponse,
} from "$workers/websocket/api/settings/messages.ts";
import Table from "$components/Table.tsx";
import TimeAgo from "$components/TimeAgo.tsx";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { useEffect } from "preact/hooks";
import { addMessage, addSystemErrorMessage } from "$frontend/toast-message.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import FileSize from "$components/FileSize.tsx";
import Loader from "$islands/Loader.tsx";

export interface BackupTargetListProps {
    targetId: number;
    onClose: () => void;
}
export default function BackupTargetList({
    targetId,
    onClose,
}: BackupTargetListProps) {
    const backups = useSignal<BackupItem[]>([]);
    const loader = useLoader();
    const deleteLoader = useLoader();
    const backupNowLoader = useLoader();
    const backupToDelete = useSelected<BackupItem>();

    const { sendMessage, dispatchMessage } = useWebsocketService<
        SettingsFrontendResponse
    >({
        eventMap: {
            settings: {
                createBackupNowResponse: (response) => {
                    if (response.result.success) {
                        loadData();
                    } else {
                        addMessage({
                            type: "error",
                            text:
                                `Could not create backup: ${response.result.message}`,
                        });
                    }

                    backupNowLoader.stop();
                },
            },
        },
    });

    const loadData = loader.wrap(async () => {
        const response = await sendMessage<
            GetBackupsMessage,
            GetBackupsResponse
        >("settings", "getBackups", {
            data: {
                target_id: targetId,
            },
            expect: "getBackupsResponse",
        });

        backups.value = response.backups;
    });

    const handleDownload = (record: BackupItem) => {
        const url = new URL(
            `/app/settings/download-backup`,
            globalThis.location.href,
        );
        url.searchParams.set("identifier", record.identifier.toString());
        url.searchParams.set("target_id", targetId.toString());

        open(url.toString(), "_blank");
    };

    const handleCreateManualBackup = async () => {
        backupNowLoader.start();
        try {
            await dispatchMessage<CreateBackupNowMessage>(
                "settings",
                "createBackupNow",
                {
                    target_id: targetId,
                },
            );
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
            backupNowLoader.stop();
        }
    };

    const handleDeleteSelected = deleteLoader.wrap(async () => {
        try {
            await sendMessage<DeleteBackupMessage, DeleteBackupResponse>(
                "settings",
                "deleteBackup",
                {
                    data: {
                        target_id: targetId,
                        identifier: backupToDelete.selected.value!.identifier,
                    },
                    expect: "deleteBackupResponse",
                },
            );
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
        } finally {
            backupToDelete.unselect();
        }

        loadData();
    });

    useEffect(() => {
        loadData();
    }, [targetId]);

    return (
        <div class="py-5">
            <div class="py-4">
                This list shows all backups made for this target. You can also
                download a specific backup or delete it. Backups are restored in
                manually by you and the process involves turning off this
                application, and replacing the database file with the backup
                file.<br />
                <br />

                Here you can also create a manual backup. Please note that
                manual backups are never deleted automatically.
                <br />
                <br />

                Amount of automatic backups stored is limited to a number
                specified by MAX_ALLOWED_BACKUP_COUNT environment variable. If
                you need to store more backups, you can create manual backups or
                increase the limit.
            </div>
            {backupNowLoader.running
                ? (
                    <div class="py-4">
                        <Loader color="white">Creating backup...</Loader>
                    </div>
                )
                : (
                    <div class="py-4">
                        <Button
                            color="success"
                            onClick={handleCreateManualBackup}
                            addClass="lg:mr-2 max-md:w-full max-md:block max-md:mb-2"
                        >
                            Create manual backup
                        </Button>
                        <Button
                            onClick={loadData}
                            addClass="max-md:w-full max-md:block"
                        >
                            Reload
                        </Button>
                    </div>
                )}
            <Table<BackupItem>
                isLoading={loader.running}
                loaderProps={{ color: "white" }}
                noRowsRow={
                    <tr>
                        <td colSpan={4} class="text-center">
                            No backups made yet.
                        </td>
                    </tr>
                }
                columns={[
                    {
                        name: "Name",
                        key: "name",
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
                        name: "Size",
                        render: (record) => <FileSize size={record.size} />,
                    },

                    {
                        name: "Actions",
                        render: (record) => (
                            <div>
                                <Button
                                    color="success"
                                    title="Manage"
                                    onClick={() => handleDownload(record)}
                                    addClass="mr-2 mb-2"
                                >
                                    <Icon name="download" />
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
                rows={backups.value}
                headerRowProps={{
                    class: "text-left",
                }}
            />

            <div class="py-5">
                <Button
                    onClick={onClose}
                    color="danger"
                >
                    Close
                </Button>
            </div>

            {backupToDelete.isSelected() && (
                <ConfirmDialog
                    prompt="Are you sure you want to delete this backup? This action cannot be undone."
                    isProcessing={deleteLoader.running}
                    visible={true}
                    confirmColor="danger"
                    onConfirm={handleDeleteSelected}
                    onCancel={() => backupToDelete.unselect()}
                />
            )}
        </div>
    );
}
