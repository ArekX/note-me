<script setup lang="ts">
import { computed } from "vue";
import Callout from "@/components/Callout.vue";
import Checkbox from "@/components/Checkbox.vue";
import Input from "@/components/Input.vue";
import type { ValidationState } from "@/composables/useValidation";
import type { S3BackupSettingsRequest } from "@/schemas/settings";

const props = defineProps<{
    validation: ValidationState;
    // The server never sends the stored secret back.
    hasStoredSecret: boolean;
}>();
const settings = defineModel<S3BackupSettingsRequest>({ required: true });

const useAccessKeys = computed({
    get: () => settings.value.credentials.type === "access_key",
    set: (checked: boolean) => {
        settings.value.credentials = checked
            ? { type: "access_key", access_key_id: "", secret_access_key: "" }
            : { type: "iam_role" };
    },
});

const credentials = computed(() =>
    settings.value.credentials.type === "access_key"
        ? settings.value.credentials
        : null,
);

const secretPlaceholder = computed(() =>
    props.hasStoredSecret ? "Leave empty to keep the stored secret" : "",
);
</script>

<template>
    <div>
        <div class="flex flex-wrap">
            <div class="w-2/4 max-md:w-full">
                <div class="py-2">
                    <Input
                        v-model="settings.bucket"
                        label="Bucket Name"
                        :validation="validation"
                        path="settings.bucket"
                    />
                    <div class="text-xs text-muted pt-1">
                        Bucket names are unique. Make sure the bucket name is
                        correct.
                    </div>
                </div>
                <div class="py-2">
                    <Input
                        v-model="settings.region"
                        label="Region"
                        :validation="validation"
                        path="settings.region"
                    />
                    <div class="text-xs text-muted pt-1">
                        Region name is the region where your S3 bucket is
                        located. Use valid name (like us-east-1) from
                        <a
                            class="underline"
                            href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html#concepts-available-regions"
                            target="_blank"
                            rel="noopener noreferrer"
                            >AWS regions</a
                        >.
                    </div>
                </div>
                <div class="py-2">
                    <Input
                        v-model="settings.prefix"
                        label="Prefix"
                        :validation="validation"
                        path="settings.prefix"
                    />
                    <div class="text-xs text-muted pt-1">
                        Prefix for a folder or set of folders (example:
                        path/to/folder) where the backups will be stored on the
                        S3 bucket.
                    </div>
                </div>
            </div>
            <div class="w-2/4 max-md:w-full pl-2 max-md:pl-0">
                <div class="py-6">
                    <Checkbox v-model="useAccessKeys" label="Use access keys" />
                    <div class="text-xs text-muted pt-1">
                        If NoteMe is hosted on AWS you can use
                        <a
                            class="underline"
                            href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            >IAM roles</a
                        >
                        which do not require access keys since you use IAM role.
                        Otherwise you can use access keys to authenticate with
                        S3.
                    </div>
                </div>
                <template v-if="credentials">
                    <div class="py-2">
                        <Input
                            v-model="credentials.access_key_id"
                            label="Access Key ID"
                            :validation="validation"
                            path="settings.credentials.access_key_id"
                        />
                    </div>
                    <div class="py-2">
                        <Input
                            v-model="credentials.secret_access_key"
                            label="Access Key Secret"
                            type="password"
                            :placeholder="secretPlaceholder"
                            :validation="validation"
                            path="settings.credentials.secret_access_key"
                        />
                    </div>
                </template>
            </div>
        </div>
        <Callout tone="info" class="max-w-xl mt-3">
            <strong>Important:</strong> All settings here are stored in the
            database itself, which also means in every backup, so anyone who can
            read a backup can also read the access keys stored here. Make sure
            to use keys that can only write to and read from this bucket. The
            bucket needs <code>s3:PutObject</code>, <code>s3:GetObject</code>,
            <code>s3:DeleteObject</code> and <code>s3:ListBucket</code>.
        </Callout>
    </div>
</template>
