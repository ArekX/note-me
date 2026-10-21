<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Skeleton from "@/components/Skeleton.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useLoader } from "@/composables/useLoader";
import { useGroupsStore } from "@/stores/groups";
import type { GroupRecord } from "@/types/records";

const props = defineProps<{ groupId: number }>();
const emit = defineEmits<{ close: [] }>();

const groupsStore = useGroupsStore();
const loader = useLoader(true);

const group = ref<GroupRecord | null>(null);

onMounted(
    loader.wrap(async () => {
        group.value = await groupsStore.getGroup(props.groupId);
    }),
);
</script>

<template>
    <Dialog
        can-cancel
        title="Group details"
        icon="folder"
        @cancel="emit('close')"
    >
        <Skeleton v-if="loader.running.value" :count="5" class="py-2" />
        <div v-else-if="group">
            <p class="pt-2 pb-2">
                <strong>Group ID:</strong> {{ groupId }} <br />
                <strong>Name:</strong> {{ group.name }} <br />
                <strong>Created:</strong> <TimeAgo :time="group.created_at" />
                <br />
                <strong>Has groups inside:</strong>
                {{ group.has_subgroups ? "Yes" : "No" }} <br />
                <strong>Has notes inside:</strong>
                {{ group.has_notes ? "Yes" : "No" }} <br />
            </p>
        </div>
        <template #footer>
            <Button @click="emit('close')">Close</Button>
        </template>
    </Dialog>
</template>
