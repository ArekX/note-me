import { SettingsMap } from "$lib/backup-handler/handlers.ts";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import {
    useValidation,
    ValidationState,
} from "$frontend/hooks/use-validation.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import {
    LocalBackupSettingsRequest,
    localBackupSettingsSchema,
} from "$schemas/settings.ts";
import { useEffect } from "preact/hooks";

interface LocalSettingsProps {
    parentValidationState: ValidationState;
    initialSettings: SettingsMap["local"];
    onChange: (settings: SettingsMap["local"]) => void;
}

export default function LocalSettings({
    parentValidationState,
    initialSettings,
    onChange,
}: LocalSettingsProps) {
    const [validationState, validate] = useValidation<
        LocalBackupSettingsRequest
    >({
        schema: localBackupSettingsSchema,
    });

    const location = useSignal<string>(initialSettings.location ?? "");

    const getData = (): LocalBackupSettingsRequest => ({
        location: location.value,
    });

    const handleOnChange = async () => {
        const data = getData();
        await validate(data);
        onChange(data);
    };

    const handleInput = (settings: Partial<SettingsMap["local"]>) => {
        location.value = settings.location ?? "";
        handleOnChange();
    };

    useEffect(() => {
        if (parentValidationState.errors.value.length > 0) {
            validate(getData());
        }
    }, [parentValidationState.errors.value]);

    return (
        <div class="py-2">
            <Input
                label="Location"
                value={location.value}
                onInput={(value) => handleInput({ location: value })}
            />
            <ErrorDisplay state={validationState} path="location" />
            <div class="text-sm max-w-xs">
                Absolute path is needed. Make sure that this location on the
                server is accessible and writable by the application.
                Application will attempt to create the directory structure if it
                does not exist and application has permission to do so.
            </div>
        </div>
    );
}
