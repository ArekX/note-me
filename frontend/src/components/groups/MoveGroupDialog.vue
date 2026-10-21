<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Loader from "@/components/Loader.vue";
import GroupPicker from "./GroupPicker.vue";
import { useLoader } from "@/composables/useLoader";
import { socketErrorMessage } from "@/lib/error-messages";
import { useTreeStore } from "@/stores/tree";
import type { TreeRecord } from "@/types/records";

const props = defineProps<{ recordId: number; recordType: "group" | "note" }>();
const emit = defineEmits<{ close: [] }>();

const treeStore = useTreeStore();

const selected = ref<TreeRecord | null>(null);
const moving = useLoader();
const error = ref("");

const typeName = computed(
    () => props.recordType[0]!.toUpperCase() + props.recordType.slice(1),
);

const canBeMoved = computed(
    () => props.recordType === "note" || selected.value?.id !== props.recordId,
);

const pick = (record: TreeRecord) => {
    selected.value = record;
    error.value = "";
};

const move = moving.wrap(async () => {
    if (!selected.value) {
        return;
    }

    const parentId = selected.value.id !== 0 ? selected.value.id : null;
    try {
        if (props.recordType === "note") {
            await treeStore.moveNote(props.recordId, parentId);
        } else {
            await treeStore.moveGroup(props.recordId, parentId);
        }
        emit("close");
    } catch (moveError) {
        error.value = socketErrorMessage(moveError);
    }
});
</script>

<template>
    <Dialog
        can-cancel
        title="Move to new group"
        icon="move"
        @cancel="emit('close')"
    >
        <Loader v-if="moving.running.value" color="white">
            Moving {{ recordType }} to new parent...
        </Loader>
        <div v-else>
            <div>Please select a for this {{ recordType }} to be moved to:</div>
            <div class="py-5">
                <GroupPicker
                    allow-root
                    :selected-id="selected?.id"
                    @pick="pick"
                />
            </div>

            <template v-if="selected !== null">
                <div v-if="!canBeMoved" class="pb-5 text-danger">
                    Cannot move a group into itself.
                </div>
                <div v-else-if="error" class="pb-5 text-danger">
                    {{ error }}
                </div>
                <div v-else class="pb-5">
                    {{ typeName }} will be moved to group &rarr;
                    {{ selected.name }}
                </div>
            </template>
        </div>
        <template v-if="!moving.running.value" #footer>
            <Button @click="emit('close')">Cancel</Button>
            <Button
                v-if="selected !== null && canBeMoved"
                color="success"
                @click="move"
            >
                Move
            </Button>
        </template>
    </Dialog>
</template>
