<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Dialog from "@/components/Dialog.vue";
import BackupTargetForm, {
    type EditableBackupTarget,
} from "./BackupTargetForm.vue";
import BackupTargetList from "./BackupTargetList.vue";

const props = defineProps<{ target: EditableBackupTarget }>();
const emit = defineEmits<{ close: [] }>();

const tab = ref<"edit" | "backups">("edit");
const tabs = computed(() => [
    { id: "edit", name: props.target.id === null ? "Create" : "Configure" },
    { id: "backups", name: "Backup List" },
]);
</script>

<template>
    <Dialog
        can-cancel
        :class="
            tab === 'backups' ? 'w-3/4 max-md:w-full' : 'w-2/4 max-md:w-full'
        "
        :title="`${target.id === null ? 'Create' : 'Manage'} Backup Target`"
        icon="data"
        @cancel="emit('close')"
    >
        <ButtonGroup
            v-if="target.id !== null"
            :items="tabs"
            :active-item="tab"
            @select="(id) => (tab = id as 'edit' | 'backups')"
        />
        <BackupTargetList
            v-if="tab === 'backups' && target.id !== null"
            :target-id="target.id"
        />
        <BackupTargetForm v-else :target="target" @close="emit('close')" />
        <template #footer>
            <Button @click="emit('close')">Close</Button>
            <Button
                v-if="tab === 'edit' || target.id === null"
                type="submit"
                form="backup-target-form"
                color="success"
            >
                Save
            </Button>
        </template>
    </Dialog>
</template>
