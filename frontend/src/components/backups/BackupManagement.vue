<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import PageHeader from "@/components/PageHeader.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import ManageBackupTargetDialog from "./ManageBackupTargetDialog.vue";
import {
    cloneSettings,
    type EditableBackupTarget,
} from "./BackupTargetForm.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import type { BackupTargetRecord } from "@/types/records";

const settingsStore = useSettingsStore();
const loader = useLoader(true);
const deleting = useLoader();

const targetToEdit = ref<EditableBackupTarget | null>(null);
const targetToDelete = ref<BackupTargetRecord | null>(null);

const columns: TableColumn<BackupTargetRecord>[] = [
    { id: "name", name: "Name", key: "name" },
    { id: "type", name: "Type" },
    { id: "created", name: "Created at" },
    { id: "updated", name: "Last update at" },
    { id: "last-backup", name: "Last successful backup at" },
    { id: "actions", name: "Actions", headerClass: "w-1/6" },
];

const load = loader.wrap(async () => {
    try {
        await settingsStore.loadBackupTargets();
    } catch (error) {
        useToastStore().reportError(error);
    }
});

const createTarget = () => {
    targetToEdit.value = {
        id: null,
        name: "",
        type: "local",
        settings: { location: "" },
    };
};

const manage = ({ id, name, type, settings }: BackupTargetRecord) => {
    targetToEdit.value = {
        id,
        name,
        type,
        settings: cloneSettings(settings),
    } as EditableBackupTarget;
};

const deleteSelected = deleting.wrap(async () => {
    try {
        await settingsStore.deleteBackupTarget(targetToDelete.value!.id);
    } catch (error) {
        useToastStore().reportError(error);
    } finally {
        targetToDelete.value = null;
    }
});

useDataChanges(["backupTarget"], load, { skipOwnRequests: true });
onMounted(load);
</script>

<template>
    <div v-if="!loader.running.value && settingsStore.maxBackupCount === 0">
        <PageHeader title="Backup Management" help="admin-backups" />
        <p class="text-muted">
            Backups are disabled by MAX_ALLOWED_BACKUP_COUNT environment
            variable. To use this page, enable backups from the environment
            variables by setting it to a value greater than 0.
        </p>
    </div>
    <div v-else>
        <PageHeader title="Backup Targets" help="admin-backups">
            Backup targets are used to specify where the backups should be
            stored. Backups are ran automatically every day at midnight (UTC) by
            <RouterLink
                :to="{ name: 'settings-periodic-tasks' }"
                class="underline"
            >
                periodic tasks</RouterLink
            >. Every backup run goes through all of the targets and stores a
            backup in each of them. A backup contains the database and all
            uploaded files. Status of each backup target with available backups
            to download can be seen in the Backup List when managing a specific
            backup.
            <template v-if="!loader.running.value" #actions>
                <Button color="success" @click="createTarget">
                    <Icon name="plus" size="lg" /> New target
                </Button>
            </template>
        </PageHeader>

        <Table
            :columns="columns"
            :rows="settingsStore.backupTargets"
            :is-loading="loader.running.value"
            :row-key="(row) => row.id"
            no-rows-text="No backup targets specified."
        >
            <template #cell-type="{ row }">
                {{ row.type === "local" ? "Local" : "AWS S3 Bucket" }}
            </template>
            <template #cell-created="{ row }">
                <TimeAgo :time="row.created_at" />
            </template>
            <template #cell-updated="{ row }">
                <TimeAgo :time="row.updated_at" />
            </template>
            <template #cell-last-backup="{ row }">
                <TimeAgo :time="row.last_backup_at" />
            </template>
            <template #cell-actions="{ row }">
                <IconButton icon="cog" title="Manage" @click="manage(row)" />
                <IconButton
                    icon="trash"
                    title="Delete"
                    danger
                    @click="targetToDelete = row"
                />
            </template>
        </Table>

        <ManageBackupTargetDialog
            v-if="targetToEdit"
            :target="targetToEdit"
            @close="targetToEdit = null"
        />
        <ConfirmDialog
            v-if="targetToDelete"
            prompt="Are you sure you want to delete this backup target?"
            confirm-color="danger"
            :is-processing="deleting.running.value"
            @confirm="deleteSelected"
            @cancel="targetToDelete = null"
        />
    </div>
</template>
