import { SettingsMap } from "$lib/backup-handler/handlers.ts";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import {
    useValidation,
    ValidationState,
} from "$frontend/hooks/use-validation.ts";
import ErrorDisplay from "$components/ErrorDisplay.tsx";
import {
    S3BackupSettingsRequest,
    s3BackupSettingsSchema,
} from "$schemas/settings.ts";
import { useEffect } from "preact/hooks";

interface S3SettingsProps {
    isNewRecord: boolean;
    parentValidationState: ValidationState;
    initialSettings: SettingsMap["s3"];
    onChange: (settings: SettingsMap["s3"]) => void;
}

export default function S3Settings({
    isNewRecord,
    parentValidationState,
    initialSettings,
    onChange,
}: S3SettingsProps) {
    const [validationState, validate] = useValidation<S3BackupSettingsRequest>({
        schema: s3BackupSettingsSchema,
    });

    const bucket = useSignal<string>(initialSettings.bucket ?? "");
    const prefix = useSignal<string>(initialSettings.prefix ?? "");
    const region = useSignal<string>(initialSettings.region ?? "");
    const type = useSignal<SettingsMap["s3"]["credentials"]["type"]>(
        initialSettings?.credentials?.type ?? "iam_role",
    );
    const accessKeyId = useSignal<string>(
        initialSettings?.credentials?.type === "access_key"
            ? initialSettings.credentials.access_key_id
            : "",
    );
    const accessKeySecret = useSignal<string>(
        initialSettings?.credentials?.type === "access_key"
            ? initialSettings.credentials.secret_access_key
            : "",
    );

    const getData = (): S3BackupSettingsRequest => ({
        bucket: bucket.value,
        prefix: prefix.value,
        region: region.value,
        credentials: type.value === "iam_role" ? { type: "iam_role" } : {
            type: "access_key",
            access_key_id: accessKeyId.value,
            secret_access_key: accessKeySecret.value,
        },
    });

    const handleOnChange = async () => {
        const data = getData();
        await validate(data);
        onChange(data as SettingsMap["s3"]);
    };

    const handleSettingsChange = (settings: Partial<SettingsMap["s3"]>) => {
        bucket.value = settings.bucket ?? bucket.value;
        prefix.value = settings.prefix ?? prefix.value;
        region.value = settings.region ?? region.value;
        type.value = settings.credentials?.type ?? type.value;

        if (settings.credentials) {
            if (settings.credentials?.type === "access_key") {
                accessKeyId.value = settings.credentials.access_key_id ??
                    accessKeyId.value;
                accessKeySecret.value =
                    settings.credentials.secret_access_key ??
                        accessKeySecret.value;
            } else {
                accessKeyId.value = "";
                accessKeySecret.value = "";
            }
        }

        handleOnChange();
    };

    useEffect(() => {
        if (parentValidationState.errors.value.length > 0) {
            validate(getData());
        }
    }, [parentValidationState.errors.value]);

    return (
        <div>
            <div class="flex flex-wrap">
                <div class="w-2/4 max-md:w-full">
                    <div class="py-2">
                        <Input
                            label="Bucket Name"
                            value={bucket.value}
                            onInput={(value) =>
                                handleSettingsChange({ bucket: value })}
                        />
                        <ErrorDisplay
                            state={validationState}
                            path="bucket"
                        />
                        <div class="text-sm">
                            Bucket names are unique. Make sure the bucket name
                            is correct.
                        </div>
                        <div class="py-2">
                            <Input
                                label="Region"
                                value={region.value}
                                onInput={(value) =>
                                    handleSettingsChange({ region: value })}
                            />
                            <ErrorDisplay
                                state={validationState}
                                path="region"
                            />
                            <div class="text-sm">
                                Region name is the region where your S3 bucket
                                is located. Use valid name (like us-east-1) from
                                {" "}
                                <a
                                    class="underline"
                                    href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions"
                                    target="_blank"
                                >
                                    AWS regions
                                </a>.
                            </div>
                        </div>
                        <div class="py-2">
                            <Input
                                label="Prefix"
                                value={prefix.value}
                                onInput={(value) =>
                                    handleSettingsChange({ prefix: value })}
                            />
                            <ErrorDisplay
                                state={validationState}
                                path="prefix"
                            />
                            <div class="text-sm">
                                Prefix for a folder or set of folders (example:
                                path/to/folder) where the backups will be stored
                                on the S3 bucket.
                            </div>
                        </div>
                    </div>
                </div>
                <div class="w-2/4 max-md:w-full pl-2 max-md:pl-0">
                    <div class="py-6">
                        <Checkbox
                            checked={type.value === "access_key"}
                            label="Use access keys"
                            onChange={(checked) => {
                                handleSettingsChange({
                                    credentials: checked
                                        ? {
                                            type: "access_key",
                                            access_key_id: "",
                                            secret_access_key: "",
                                        }
                                        : { type: "iam_role" },
                                });
                            }}
                        />
                        <div class="text-sm">
                            If NoteMe is hosted on AWS you can use{" "}
                            <a
                                class="underline"
                                href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html"
                                target="_blank"
                            >
                                IAM roles
                            </a>{" "}
                            which do not require access keys since you use IAM
                            role. Otherwise you can use access keys to
                            authenticate with S3. <br />
                        </div>
                    </div>
                    {type.value === "access_key" && (
                        <>
                            <div class="py-2">
                                <Input
                                    label="Access Key ID"
                                    value={accessKeyId.value}
                                    onInput={(value) =>
                                        handleSettingsChange({
                                            credentials: {
                                                type: "access_key",
                                                access_key_id: value,
                                                secret_access_key:
                                                    accessKeySecret.value,
                                            },
                                        })}
                                />
                                <ErrorDisplay
                                    state={validationState}
                                    path="credentials.access_key_id"
                                />
                            </div>
                            <div class="py-2">
                                <Input
                                    label="Access Key Secret"
                                    type={isNewRecord ? "text" : "password"}
                                    value={accessKeySecret.value}
                                    onInput={(value) =>
                                        handleSettingsChange({
                                            credentials: {
                                                type: "access_key",
                                                access_key_id:
                                                    accessKeyId.value,
                                                secret_access_key: value,
                                            },
                                        })}
                                />
                                <ErrorDisplay
                                    state={validationState}
                                    path="credentials.secret_access_key"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div class="text-sm max-w-xl">
                <strong>Important:</strong>{" "}
                All settings here will be stored in the database itself which
                also mean the backup itself, meaning anyone downloading and
                reading the database will also have access to any access keys or
                secrets stored here. Make sure to use the{" "}
                <a
                    class="underline"
                    href="https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_permissions_least_privileges.html"
                    target="_blank"
                >
                    least privileged access keys and secrets
                </a>{" "}
                or use an IAM role if possible.

                <br />
                <br />

                Following permissions are required for the AWS S3 bucket backup
                to work properly:
                <ul class="list-disc pl-4">
                    <li>
                        <strong>GetObject</strong>{" "}
                        - To download the backup itself.
                    </li>
                    <li>
                        <strong>GetObjectAttributes</strong>{" "}
                        - To get stored backup information such as file size.
                    </li>
                    <li>
                        <strong>PutObject</strong> - To store created backups.
                    </li>
                    <li>
                        <strong>DeleteObject</strong>{" "}
                        - To delete created backups (used either by user or to
                        delete old backups).
                    </li>
                    <li>
                        <strong>ListBucket</strong> - To list backups stored.
                    </li>
                </ul>
            </div>
        </div>
    );
}
