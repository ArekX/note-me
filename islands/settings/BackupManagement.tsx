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
} from "$workers/websocket/api/settings/messages.ts";

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

    const { sendMessage } = useWebsocketService();

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

    const loadData = loader.wrap(async () => {
        await Promise.all([loadBackups(), loadSettings()]);
    });

    useEffect(() => {
        loadData();
    }, []);

    if (loader.running) {
        return <Loader />;
    }

    return (
        <div>
            <h1 class="text-xl mb-4">Backup / Restore</h1>
            <div class="flex">
                <div class="pt-7 w-1/5">
                    <Checkbox
                        label="Enable automatic backups"
                        checked={!!settings.value.is_auto_backup_enabled}
                        onChange={() => {
                            settings.value = {
                                ...settings.value,
                                is_auto_backup_enabled: +settings.value
                                    .is_auto_backup_enabled,
                            };
                        }}
                    />
                </div>
                <div class="w-1/5">
                    <Input
                        labelColor="black"
                        label="Maximum amount of days to keep backups"
                        value={settings.value.max_backup_days.toString()}
                        onInput={(value) => {
                            settings.value = {
                                ...settings.value,
                                max_backup_days: +value,
                            };
                        }}
                        type="number"
                    />
                </div>
            </div>
            <div>
                <h2 class="text-lg">Available backups</h2>

                {backups.value.length === 0 && <div>No backups available</div>}

                {backups.value.map((backup) => (
                    <div class="flex items-center justify-between">
                        <div>{backup}</div>
                        <div>
                            <button class="text-red-500">Restore</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
