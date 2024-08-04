import { BackupTargetRecord } from "$backend/repository/backup-target-repository.ts";
import { useSignal } from "@preact/signals";
import { SettingsMap, TargetType } from "$lib/backup-handler/handlers.ts";
import Input from "$components/Input.tsx";
import Picker from "$components/Picker.tsx";
import Button from "$components/Button.tsx";
import S3Settings from "$islands/backups/settings/S3Settings.tsx";
import LocalSettings from "$islands/backups/settings/LocalSettings.tsx";
import DropdownList from "$components/DropdownList.tsx";
import { useValidation } from "$frontend/hooks/use-validation.ts";
import { BackupTargetRequest, backupTargetSchema } from "$schemas/settings.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateBackupTargetMessage,
    CreateBackupTargetResponse,
    UpdateBackupTargetMessage,
    UpdateBackupTargetResponse,
} from "$workers/websocket/api/settings/messages.ts";
import { addSystemErrorMessage } from "$frontend/toast-message.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";

export type TargetBackupFormRecord =
    & Omit<
        BackupTargetRecord,
        "id" | "created_at" | "updated_at" | "last_backup_at"
    >
    & {
        id: number | null;
    };

interface BackupTargetFormProps {
    initialRecord: TargetBackupFormRecord;
    onClose: () => void;
}

export default function BackupTargetForm({
    initialRecord,
    onClose,
}: BackupTargetFormProps) {
    const name = useSignal(initialRecord.name);
    const type = useSignal<TargetType>(initialRecord.type);
    const settings = useSignal<BackupTargetRecord["settings"]>(
        initialRecord.settings,
    );

    const processorLoader = useLoader();

    const [
        validationState,
        validate,
    ] = useValidation<BackupTargetRequest>({ schema: backupTargetSchema });

    const { sendMessage } = useWebsocketService();

    const handleTypeChange = (value: TargetType) => {
        if (value === initialRecord.type) {
            settings.value = structuredClone(initialRecord.settings);
        } else {
            settings.value = value === "local" ? { location: "" } : {
                bucket: "",
                region: "",
                prefix: "",
                credentials: {
                    type: "iam_role",
                },
            };
        }

        type.value = value;
    };

    const handleSaveTarget = processorLoader.wrap(async () => {
        const data: BackupTargetRequest = {
            name: name.value,
            type: type.value,
            settings: settings.value,
        } as BackupTargetRequest;

        if (!await validate(data as BackupTargetRequest)) {
            return;
        }

        try {
            if (initialRecord.id === null) {
                await sendMessage<
                    CreateBackupTargetMessage,
                    CreateBackupTargetResponse
                >("settings", "createBackupTarget", {
                    data: {
                        target: data,
                    },
                    expect: "createBackupTargetResponse",
                });
            } else {
                await sendMessage<
                    UpdateBackupTargetMessage,
                    UpdateBackupTargetResponse
                >("settings", "updateBackupTarget", {
                    data: {
                        target_id: initialRecord.id,
                        data,
                    },
                    expect: "updateBackupTargetResponse",
                });
            }

            onClose();
        } catch (e) {
            addSystemErrorMessage(e as SystemErrorMessage);
        }
    });

    return (
        <div>
            <div class="py-2">
                <Input
                    label="Target name"
                    value={name.value}
                    onInput={(value) => name.value = value}
                />
                <ErrorDisplay state={validationState} path="name" />
            </div>

            <div class="py-2">
                <DropdownList<TargetType>
                    label="Backup Type"
                    items={[
                        { value: "s3", label: "AWS S3 Bucket" },
                        { value: "local", label: "Local" },
                    ]}
                    value={type.value}
                    onInput={handleTypeChange}
                />
                <ErrorDisplay state={validationState} path="type" />
            </div>

            <div class="py-2">
                <Picker<TargetType>
                    selector={type.value}
                    map={{
                        s3: () => (
                            <S3Settings
                                isNewRecord={initialRecord.id === null}
                                parentValidationState={validationState}
                                initialSettings={initialRecord
                                    .settings as SettingsMap["s3"]}
                                onChange={(value) => settings.value = value}
                            />
                        ),
                        local: () => (
                            <LocalSettings
                                parentValidationState={validationState}
                                initialSettings={initialRecord
                                    .settings as SettingsMap["local"]}
                                onChange={(value) => settings.value = value}
                            />
                        ),
                    }}
                />
            </div>

            {processorLoader.running
                ? <Loader color="white">Saving...</Loader>
                : (
                    <div class="py-5">
                        <Button
                            onClick={handleSaveTarget}
                            color="success"
                        >
                            Save
                        </Button>
                        <Button
                            onClick={onClose}
                            color="danger"
                            addClass="ml-2"
                        >
                            Close
                        </Button>
                    </div>
                )}
        </div>
    );
}
