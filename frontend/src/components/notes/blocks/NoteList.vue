<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { redirectTo } from "@/lib/redirect";
import type { GetTreeMessage, GetTreeResponse } from "@/types/messages";
import type { TreeRecord } from "@/types/records";

// Group 0 is the top level.
const props = withDefaults(
    defineProps<{ groupId: number; allowLinks?: boolean }>(),
    { allowLinks: true },
);

const router = useRouter();
const { sendMessage } = useWebsocketService();
const loader = useLoader(true);
const notes = ref<TreeRecord[]>([]);

const loadNotes = loader.wrap(async () => {
    const response = await sendMessage<GetTreeMessage, GetTreeResponse>(
        "tree",
        "getTree",
        {
            data: {
                parent_id: props.groupId !== 0 ? props.groupId : undefined,
                item_type: "note",
            },
            expect: "getTreeResponse",
        },
    );
    notes.value = response.records;
});

watch(() => props.groupId, loadNotes, { immediate: true });

const noteHref = (noteId: number) =>
    props.allowLinks
        ? router.resolve(redirectTo.viewNote({ noteId })).href
        : "#";

const openNote = (noteId: number) => {
    if (props.allowLinks) {
        void router.push(redirectTo.viewNote({ noteId }));
    }
};
</script>

<template>
    <div>
        <div
            v-if="loader.running.value"
            role="status"
            aria-busy="true"
            aria-label="Loading"
            class="flex flex-col gap-2 ml-4 py-1"
        >
            <span
                v-for="width in ['w-48', 'w-36', 'w-56']"
                :key="width"
                :class="['skeleton h-3.5', width]"
            />
        </div>
        <template v-else>
            <div v-if="notes.length === 0" class="text-muted">
                No notes found in this group.
            </div>
            <ul class="list-disc ml-4">
                <li v-for="record in notes" :key="record.id">
                    <a
                        class="cursor-pointer text-muted hover:underline"
                        :href="noteHref(record.id)"
                        :target="allowLinks ? '_blank' : undefined"
                        @click.prevent.stop="openNote(record.id)"
                    >
                        {{ record.name }}
                    </a>
                </li>
            </ul>
        </template>
    </div>
</template>
