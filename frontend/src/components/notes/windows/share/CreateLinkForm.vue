<script setup lang="ts">
import { ref } from "vue";
import { nowUnix, toUnix } from "@/lib/unix-time";
import Button from "@/components/Button.vue";
import Checkbox from "@/components/Checkbox.vue";
import Input from "@/components/Input.vue";
import Loader from "@/components/Loader.vue";
import { useLoader } from "@/composables/useLoader";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useToastStore } from "@/stores/toast";
import type {
    CreatePublicShareMessage,
    CreatePublicShareResponse,
} from "@/types/messages";
import type { PublicNoteShareRecord } from "@/types/records";

const props = defineProps<{ noteId: number }>();
const emit = defineEmits<{ linkCreated: [record: PublicNoteShareRecord] }>();

const { sendMessage } = useWebsocketService();
const loader = useLoader();
const includeExpiration = ref(false);
const expiresAt = ref("");

const tomorrow = useTimeFormat().formatIsoDate(nowUnix() + 86400);

const toggleExpiration = (value: boolean) => {
    includeExpiration.value = value;
    if (!value) {
        expiresAt.value = "";
    }
};

// A date-only string parses as UTC midnight, as in the original.
const createLink = loader.wrap(async () => {
    try {
        const { record } = await sendMessage<
            CreatePublicShareMessage,
            CreatePublicShareResponse
        >("notes", "createPublicShare", {
            data: {
                note_id: props.noteId,
                expires_at: includeExpiration.value
                    ? toUnix(new Date(expiresAt.value))
                    : null,
            },
            expect: "createPublicShareResponse",
        });
        toggleExpiration(false);
        emit("linkCreated", record);
    } catch (error) {
        useToastStore().reportError(error);
    }
});
</script>

<template>
    <div class="text-xl font-semibold py-2">New link</div>
    <div class="flex items-start flex-wrap">
        <div class="mt-2">
            <Loader v-if="loader.running.value" color="white">Saving...</Loader>
            <Button
                v-else
                color="success"
                :disabled="includeExpiration && expiresAt.length === 0"
                @click="createLink"
            >
                Create link
            </Button>
        </div>
        <div
            class="max-md:basis-full flex flex-wrap items-start link-form-expiration ml-2"
        >
            <div class="pr-2 pt-4">
                <Checkbox
                    :model-value="includeExpiration"
                    label="Add expiration date"
                    @update:model-value="toggleExpiration"
                />
            </div>
            <div v-if="includeExpiration" class="h-14 max-md:basis-full">
                <Input v-model="expiresAt" type="date" :min="tomorrow" />
                <div v-if="expiresAt.length === 0" class="text-sm text-danger">
                    Please enter expiration date.
                </div>
            </div>
            <div v-else class="h-14 w-10"></div>
        </div>
    </div>
</template>
