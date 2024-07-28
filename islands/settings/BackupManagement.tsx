import Checkbox from "$islands/Checkbox.tsx";
import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { Settings } from "$backend/repository/settings-repository.ts";
import Loader from "$islands/Loader.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateBackupNowMessage,
    DeleteBackupMessage,
    DeleteBackupResponse,
    GetBackupsMessage,
    GetBackupsResponse,
    GetSettingsMessage,
    GetSettingsResponse,
    SettingsFrontendResponse,
    UpdateSettingsMessage,
    UpdateSettingsResponse,
} from "$workers/websocket/api/settings/messages.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import { useValidation } from "$frontend/hooks/use-validation.ts";
import { backupSettingsSchema } from "$schemas/settings.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import Button from "$components/Button.tsx";
import { BackupRecord } from "$backend/backups.ts";
import { addMessage } from "$frontend/toast-message.ts";
import Table from "$components/Table.tsx";
import TimeAgo from "$components/TimeAgo.tsx";
import FileSize from "$components/FileSize.tsx";
import Icon from "$components/Icon.tsx";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import Dialog from "$islands/Dialog.tsx";

type BackupSettings = Pick<
    Settings,
    "is_auto_backup_enabled" | "max_backup_days"
>;

export default function BackupManagement() {
    const backups = useSignal<BackupRecord[]>([]);
    const settings = useSignal<BackupSettings>({
        is_auto_backup_enabled: 0,
        max_backup_days: 0,
    });
    const loader = useLoader(true);
    const saver = useLoader();
    const backupProcessing = useLoader();

    const backupToDelete = useSignal<BackupRecord | null>(null);

    const { sendMessage, dispatchMessage } = useWebsocketService<
        SettingsFrontendResponse
    >({
        eventMap: {
            settings: {
                createBackupNowResponse: (message) => {
                    backups.value = [...backups.value, message.backup];

                    addMessage({
                        type: "success",
                        text: "Backup created successfully.",
                    });

                    backupProcessing.stop();
                },
            },
        },
    });

    const [settingsValidation, validateSettings] = useValidation({
        schema: backupSettingsSchema,
    });

    const loadBackups = async () => {
        const backupsResponse = await sendMessage<
            GetBackupsMessage,
            GetBackupsResponse
        >(
            "settings",
            "getBackups",
            {
                expect: "getBackupsResponse",
            },
        );

        backups.value = backupsResponse.backups;
    };

    const loadSettings = async () => {
        const response = await sendMessage<
            GetSettingsMessage,
            GetSettingsResponse
        >("settings", "getSettings", {
            data: {
                keys: ["is_auto_backup_enabled", "max_backup_days"],
            },
            expect: "getSettingsResponse",
        });

        settings.value = {
            ...response.settings as BackupSettings,
        };
    };

    const saveSettings = useDebouncedCallback(async () => {
        if (!await validateSettings(settings.value)) {
            saver.stop();
            return;
        }

        await sendMessage<UpdateSettingsMessage, UpdateSettingsResponse>(
            "settings",
            "updateSettings",
            {
                data: {
                    settings: settings.value,
                },
                expect: "updateSettingsResponse",
            },
        );
        saver.stop();
    });

    const loadData = loader.wrap(async () => {
        await Promise.all([loadBackups(), loadSettings()]);
    });

    const handleEnableAutomaticBackupToggle = () => {
        settings.value = {
            ...settings.value,
            is_auto_backup_enabled: +!settings.value
                .is_auto_backup_enabled,
        };
        saver.start();
        saveSettings();
    };

    const handleMaxBackupDaysChange = (value: string) => {
        settings.value = {
            ...settings.value,
            max_backup_days: +value,
        };
        saver.start();
        saveSettings();
    };

    const deleteBackup = async () => {
        if (!backupToDelete.value) {
            return;
        }

        await sendMessage<DeleteBackupMessage, DeleteBackupResponse>(
            "settings",
            "deleteBackup",
            {
                data: {
                    backup: backupToDelete.value.name,
                },
                expect: "deleteBackupResponse",
            },
        );
        addMessage({
            type: "success",
            text: `Backup '${backupToDelete.value.name}' deleted successfully.`,
        });

        backups.value = backups.value.filter((b) =>
            b.name !== backupToDelete.value!.name
        );

        backupToDelete.value = null;
    };

    const createNewBackup = () => {
        dispatchMessage<CreateBackupNowMessage>(
            "settings",
            "createBackupNow",
        );

        backupProcessing.start();
    };

    const downloadBackup = (backup: string) => {
        open(`/app/settings/download-backup?name=${backup}`, "_blank");
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loader.running) {
        return <Loader />;
    }

    return (
        <div>
            <h1 class="text-xl mb-4 font-semibold">Backup / Restore</h1>
            <div class="flex h-20">
                <div class="pt-7 w-1/5">
                    <Checkbox
                        label="Enable automatic backups"
                        checked={!!settings.value.is_auto_backup_enabled}
                        onChange={handleEnableAutomaticBackupToggle}
                    />
                    <ErrorDisplay
                        path="is_auto_backup_enabled"
                        state={settingsValidation}
                    />
                </div>
                {!!settings.value.is_auto_backup_enabled && (
                    <div class="w-1/5">
                        <Input
                            labelColor="black"
                            label="Maximum days to keep automated backups"
                            min="1"
                            value={settings.value.max_backup_days.toString()}
                            onInput={handleMaxBackupDaysChange}
                            type="number"
                        />

                        <ErrorDisplay
                            path="max_backup_days"
                            state={settingsValidation}
                        />
                    </div>
                )}
                <div class="w-1/5 pt-7 pl-2">
                    {saver.running && <Loader>Saving...</Loader>}
                </div>
            </div>
            <div>
                <div>
                    <Button onClick={createNewBackup}>Create New Backup</Button>
                </div>
                <h2 class="text-lg font-semibold mt-4">Available backups</h2>

                <div class="py-4 w-3/4">
                    <strong>Note:</strong>{" "}
                    <p>
                        To restore NoteMe from these backups, you need to copy
                        the backup file to NoteMe application replacing the
                        current database file and restart the server.
                    </p>

                    <p>All notes and files are stored in the database file.</p>
                </div>

                <Table<BackupRecord>
                    noRowsRow={
                        <tr>
                            <td colSpan={4} class="text-center">
                                No backups found.
                            </td>
                        </tr>
                    }
                    columns={[
                        {
                            name: "Name",
                            key: "name",
                        },
                        {
                            name: "Created At",
                            render: (record) => (
                                <TimeAgo time={record.created_at} />
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
                                        color="primary"
                                        addClass="mr-2"
                                        title="Download"
                                        onClick={() =>
                                            downloadBackup(record.name)}
                                    >
                                        <Icon name="download" />
                                    </Button>
                                    <Button
                                        color="danger"
                                        title="Delete"
                                        onClick={() =>
                                            backupToDelete.value = record}
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
            </div>
            {backupToDelete.value && (
                <ConfirmDialog
                    prompt="Are you sure you want to delete this backup?"
                    confirmText="Delete backup"
                    confirmColor="danger"
                    visible={true}
                    onCancel={() => backupToDelete.value = null}
                    onConfirm={deleteBackup}
                />
            )}
            {backupProcessing.running && (
                <Dialog
                    visible={true}
                    canCancel={false}
                >
                    <Loader color="white">Creating backup...</Loader>
                </Dialog>
            )}
        </div>
    );
}
