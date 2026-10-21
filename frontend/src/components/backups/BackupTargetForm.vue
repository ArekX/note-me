<script lang="ts">
import type { BackupTargetRequest as TargetRequest } from "@/schemas/settings";

export type EditableBackupTarget = TargetRequest & { id: number | null };

// structuredClone cannot copy reactive proxies; settings are plain JSON.
export const cloneSettings = <T,>(settings: T): T =>
    JSON.parse(JSON.stringify(settings));
</script>

<script setup lang="ts">
import { ref } from "vue";
import DropdownList from "@/components/DropdownList.vue";
import Input from "@/components/Input.vue";
import Loader from "@/components/Loader.vue";
import LocalSettings from "./LocalSettings.vue";
import S3Settings from "./S3Settings.vue";
import { useLoader } from "@/composables/useLoader";
import { useValidation } from "@/composables/useValidation";
import {
    backupTargetSchema,
    type BackupTargetRequest,
    type LocalBackupSettingsRequest,
    type S3BackupSettingsRequest,
} from "@/schemas/settings";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import type { BackupTargetType } from "@/types/records";

const props = defineProps<{ target: EditableBackupTarget }>();
const emit = defineEmits<{ close: [] }>();

const settingsStore = useSettingsStore();
const saving = useLoader();
const validation = useValidation<BackupTargetRequest>(backupTargetSchema);

const emptySettings = {
    local: (): LocalBackupSettingsRequest => ({ location: "" }),
    s3: (): S3BackupSettingsRequest => ({
        bucket: "",
        region: "",
        prefix: "",
        credentials: { type: "iam_role" },
    }),
};

const hasStoredSecret =
    props.target.id !== null &&
    props.target.type === "s3" &&
    props.target.settings.credentials.type === "access_key";

const name = ref(props.target.name);
const type = ref<BackupTargetType>(props.target.type);
const localSettings = ref(
    props.target.type === "local"
        ? cloneSettings(props.target.settings)
        : emptySettings.local(),
);
const s3Settings = ref(
    props.target.type === "s3"
        ? cloneSettings(props.target.settings)
        : emptySettings.s3(),
);

const typeItems: { value: BackupTargetType; label: string }[] = [
    { value: "s3", label: "AWS S3 Bucket" },
    { value: "local", label: "Local" },
];

const data = (): BackupTargetRequest =>
    type.value === "local"
        ? { name: name.value, type: "local", settings: localSettings.value }
        : { name: name.value, type: "s3", settings: s3Settings.value };

// An empty secret keeps the stored one on the server, so it passes the form
// check as if it were set.
const validationData = (): BackupTargetRequest => {
    const current = cloneSettings(data());
    if (
        hasStoredSecret &&
        current.type === "s3" &&
        current.settings.credentials.type === "access_key" &&
        !current.settings.credentials.secret_access_key
    ) {
        current.settings.credentials.secret_access_key = "stored";
    }
    return current;
};

const save = saving.wrap(async () => {
    if (!(await validation.validate(validationData()))) {
        return;
    }
    try {
        await settingsStore.saveBackupTarget(props.target.id, data());
        emit("close");
    } catch (error) {
        if (validation.setServerErrors(error)) {
            return;
        }
        useToastStore().reportError(error);
    }
});
</script>

<template>
    <form id="backup-target-form" @submit.prevent="save">
        <div class="py-2">
            <Input
                v-model="name"
                label="Target name"
                :validation="validation.state"
                path="name"
            />
        </div>
        <div class="py-2">
            <DropdownList
                v-model="type"
                label="Backup Type"
                :items="typeItems"
                :validation="validation.state"
                path="type"
            />
        </div>
        <div class="py-2">
            <LocalSettings
                v-if="type === 'local'"
                v-model="localSettings"
                :validation="validation.state"
            />
            <S3Settings
                v-else
                v-model="s3Settings"
                :validation="validation.state"
                :has-stored-secret="hasStoredSecret"
            />
        </div>
        <Loader v-if="saving.running.value" color="white">Saving...</Loader>
    </form>
</template>
