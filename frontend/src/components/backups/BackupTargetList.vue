<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import IconButton from "@/components/IconButton.vue";
import Loader from "@/components/Loader.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import FileSize from "@/components/files/FileSize.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import type {
    CreateBackupNowMessage,
    DeleteBackupMessage,
    DeleteBackupResponse,
    GetBackupsMessage,
    GetBackupsResponse,
    SettingsFrontendResponse,
} from "@/types/messages";
import type { BackupItem } from "@/types/records";

const props = defineProps<{ targetId: number }>();

const settingsStore = useSettingsStore();
const toastStore = useToastStore();
const loader = useLoader(true);
const deleting = useLoader();
const isBackingUp = ref(false);
const backups = ref<BackupItem[]>([]);
const backupToDelete = ref<BackupItem | null>(null);

const columns: TableColumn<BackupItem>[] = [
    { id: "name", name: "Name", key: "name" },
    { id: "created", name: "Created at" },
    { id: "size", name: "Size" },
    { id: "actions", name: "Actions" },
];

const load = loader.wrap(async () => {
    try {
        const response = await sendMessage<
            GetBackupsMessage,
            GetBackupsResponse
        >("settings", "getBackups", {
            data: { target_id: props.targetId },
            expect: "getBackupsResponse",
        });
        backups.value = response.backups;
    } catch (error) {
        toastStore.reportError(error);
    }
});

const { sendMessage, dispatchMessage } =
    useWebsocketService<SettingsFrontendResponse>({
        settings: {
            createBackupNowResponse: ({ result }) => {
                if (!isBackingUp.value) {
                    return;
                }
                isBackingUp.value = false;
                if (!result.success) {
                    toastStore.addMessage({
                        type: "error",
                        text: `Could not create backup: ${result.message}`,
                    });
                    return;
                }
                settingsStore.markBackedUp(
                    result.target_id,
                    result.backup.created_at,
                );
                void load();
            },
        },
    });

// The server answers when the backup is done, which can take minutes.
const createManualBackup = async () => {
    isBackingUp.value = true;
    try {
        await dispatchMessage<CreateBackupNowMessage>(
            "settings",
            "createBackupNow",
            { target_id: props.targetId },
        );
    } catch (error) {
        isBackingUp.value = false;
        toastStore.reportError(error);
    }
};

const download = (backup: BackupItem) => {
    const params = new URLSearchParams({
        identifier: backup.identifier,
        target_id: String(props.targetId),
    });
    window.open(`/api/settings/download-backup?${params}`, "_blank");
};

const deleteSelected = deleting.wrap(async () => {
    try {
        await sendMessage<DeleteBackupMessage, DeleteBackupResponse>(
            "settings",
            "deleteBackup",
            {
                data: {
                    target_id: props.targetId,
                    identifier: backupToDelete.value!.identifier,
                },
                expect: "deleteBackupResponse",
            },
        );
    } catch (error) {
        toastStore.reportError(error);
    } finally {
        backupToDelete.value = null;
    }
    await load();
});

useDataChanges(["backup"], load, { skipOwnRequests: true });
onMounted(load);
</script>

<template>
    <div class="py-5">
        <div class="py-4">
            This list shows all backups made for this target. Each backup is a
            ZIP file with the database and all uploaded files, encrypted with
            the server's <code>BACKUP_ENCRYPTION_KEY</code>. You can download a
            specific backup or delete it.
            <br />
            <br />
            To restore a backup, stop NoteMe, download the backup and run
            <code
                >noteme-cli restore-backup --overwrite
                &lt;backup.zip.enc&gt;</code
            >
            with the same <code>DATABASE_DSN</code>,
            <code>FILES_LOCATION</code> and
            <code>BACKUP_ENCRYPTION_KEY</code> the server uses, then start
            NoteMe again.
            <br />
            <br />
            Here you can also create a manual backup. Please note that manual
            backups are never deleted automatically. Amount of automatic backups
            stored is limited to a number specified by MAX_ALLOWED_BACKUP_COUNT
            environment variable. If you need to store more backups, you can
            create manual backups or increase the limit.
        </div>
        <div v-if="isBackingUp" class="py-4">
            <Loader color="white">Creating backup...</Loader>
        </div>
        <div v-else class="py-4">
            <Button
                color="success"
                add-class="lg:mr-2 max-md:w-full max-md:block max-md:mb-2"
                @click="createManualBackup"
            >
                Create manual backup
            </Button>
            <Button add-class="max-md:w-full max-md:block" @click="load">
                Reload
            </Button>
        </div>

        <Table
            :columns="columns"
            :rows="backups"
            :is-loading="loader.running.value"
            :row-key="(row) => row.identifier"
            no-rows-text="No backups made yet."
        >
            <template #cell-created="{ row }">
                <TimeAgo :time="row.created_at" />
            </template>
            <template #cell-size="{ row }">
                <FileSize :size="row.size" />
            </template>
            <template #cell-actions="{ row }">
                <IconButton
                    icon="download"
                    title="Download"
                    @click="download(row)"
                />
                <IconButton
                    icon="trash"
                    title="Delete"
                    danger
                    @click="backupToDelete = row"
                />
            </template>
        </Table>

        <ConfirmDialog
            v-if="backupToDelete"
            prompt="Are you sure you want to delete this backup? This action cannot be undone."
            confirm-color="danger"
            :is-processing="deleting.running.value"
            @confirm="deleteSelected"
            @cancel="backupToDelete = null"
        />
    </div>
</template>
