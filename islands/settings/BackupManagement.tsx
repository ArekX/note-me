import Checkbox from "$islands/Checkbox.tsx";
import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { Settings } from "$backend/repository/settings-repository.ts";
import Loader from "$islands/Loader.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetBackupsMessage,
    GetBackupsResponse,
    GetSettingsMessage,
    GetSettingsResponse,
    UpdateSettingsMessage,
    UpdateSettingsResponse,
} from "$workers/websocket/api/settings/messages.ts";
import { useDebouncedCallback } from "$frontend/hooks/use-debounced-callback.ts";
import { useValidation } from "$frontend/hooks/use-validation.ts";
import { backupSettingsSchema } from "$schemas/settings.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import Button from "$components/Button.tsx";

type BackupSettings = Pick<
    Settings,
    "is_auto_backup_enabled" | "max_backup_days"
>;

export default function BackupManagement() {
    const backups = useSignal<string[]>([]);
    const settings = useSignal<BackupSettings>({
        is_auto_backup_enabled: 0,
        max_backup_days: 0,
    });
    const loader = useLoader(true);
    const saver = useLoader();

    const { sendMessage } = useWebsocketService();

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
                            label="Maximum amount of days to keep backups"
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
                <h2 class="text-lg font-semibold">Available backups</h2>

                {backups.value.length === 0 && <div>No backups available</div>}

                {backups.value.map((backup) => (
                    <div class="flex items-center justify-between">
                        <div>{backup}</div>
                        <div>
                            <Button color="success">Restore</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
