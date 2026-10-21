<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Callout from "@/components/Callout.vue";
import Dialog from "@/components/Dialog.vue";
import Skeleton from "@/components/Skeleton.vue";
import ShareLinks from "./share/ShareLinks.vue";
import ShareToUsers from "./share/ShareToUsers.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useToastStore } from "@/stores/toast";
import type {
    GetNoteShareDataMessage,
    GetNoteShareDataResponse,
} from "@/types/messages";
import type { PickUserRecord, PublicNoteShareRecord } from "@/types/records";

type Tab = "toUsers" | "toEveryone";

const tabs: { id: Tab; name: string }[] = [
    { id: "toUsers", name: "To users" },
    { id: "toEveryone", name: "To everyone" },
];

const props = defineProps<{ noteId: number; isProtected: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { sendMessage } = useWebsocketService();
const loader = useLoader(true);
const tab = ref<Tab>("toUsers");
const users = ref<PickUserRecord[]>([]);
const links = ref<PublicNoteShareRecord[]>([]);

const status = computed(() => {
    if (links.value.length > 0) {
        return "Public";
    }
    return users.value.length > 0 ? "Specific users only" : "Private";
});

const fetchShareData = async () => {
    if (props.isProtected) {
        return;
    }
    const response = await sendMessage<
        GetNoteShareDataMessage,
        GetNoteShareDataResponse
    >("notes", "getNoteShareData", {
        data: { note_id: props.noteId },
        expect: "getNoteShareDataResponse",
    });
    users.value = response.users;
    links.value = response.links;
};

const load = loader.wrap(fetchShareData);

// The tabs copy their initial lists, so a change made elsewhere remounts them.
const revision = ref(0);
const refresh = async () => {
    try {
        await fetchShareData();
        revision.value++;
    } catch (error) {
        useToastStore().reportError(error);
    }
};
useDataChanges(["share"], refresh, {
    skipOwnRequests: true,
    matches: (ids) => ids.includes(props.noteId),
});

onMounted(load);
</script>

<template>
    <Dialog
        icon="share-alt"
        can-cancel
        title="Share"
        class="md:w-3/4 lg:w-2/4 max-md:w-full"
        @cancel="emit('close')"
    >
        <Callout v-if="isProtected" tone="danger" class="my-4">
            Protected notes cannot be shared.
        </Callout>
        <div v-else-if="loader.running.value">
            <span class="skeleton h-3.5 w-48 mb-4" />
            <span class="skeleton h-9 w-52 rounded-lg" />
            <Skeleton variant="list" :count="2" class="py-4" />
        </div>
        <div v-else>
            <div class="pb-4">
                Share status: <strong>{{ status }}</strong>
            </div>
            <ButtonGroup
                :items="tabs"
                :active-item="tab"
                @select="tab = $event"
            />
            <div class="pt-4 pb-4">
                <ShareToUsers
                    v-if="tab === 'toUsers'"
                    :key="`users-${revision}`"
                    :note-id="noteId"
                    :initial-users="users"
                    @users-changed="(newUsers) => (users = newUsers)"
                />
                <ShareLinks
                    v-else
                    :key="`links-${revision}`"
                    :note-id="noteId"
                    :initial-links="links"
                    @links-changed="(newLinks) => (links = newLinks)"
                />
            </div>
        </div>

        <template #footer>
            <Button color="primary" @click="emit('close')">Close</Button>
        </template>
    </Dialog>
</template>
