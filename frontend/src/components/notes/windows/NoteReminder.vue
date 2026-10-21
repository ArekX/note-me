<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Dialog from "@/components/Dialog.vue";
import NoItemMessage from "@/components/NoItemMessage.vue";
import Skeleton from "@/components/Skeleton.vue";
import OneTimeReminder from "./reminder/OneTimeReminder.vue";
import QuickPickReminder from "./reminder/QuickPickReminder.vue";
import RepeatReminder from "./reminder/RepeatReminder.vue";
import { useLoader } from "@/composables/useLoader";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { validateDateTime, validateRepeat } from "@/lib/reminder-validation";
import { nowUnix, toUnix } from "@/lib/unix-time";
import { useToastStore } from "@/stores/toast";
import type {
    GetNoteReminderDataMessage,
    GetNoteReminderDataResponse,
    RemoveReminderMessage,
    RemoveReminderResponse,
    SetReminderMessage,
    SetReminderResponse,
} from "@/types/messages";

type Tab = "preset" | "once" | "repeat";

const tabs: { id: Tab; name: string }[] = [
    { id: "preset", name: "Quick Pick" },
    { id: "once", name: "Remind me once" },
    { id: "repeat", name: "Remind me repeatedly" },
];

const props = defineProps<{ noteId: number }>();
const emit = defineEmits<{ close: [] }>();

const { sendMessage } = useWebsocketService();
const toastStore = useToastStore();
const timeFormat = useTimeFormat();
const loader = useLoader(true);

const isReminderAdded = ref(false);
const isDataLoaded = ref(false);
const tab = ref<Tab>("preset");
const date = ref("");
const time = ref("");
const interval = ref(1);
const unit = ref(60);
const repeat = ref(1);

const resetValues = () => {
    date.value = timeFormat.formatIsoDate(new Date());
    time.value = timeFormat.formatIsoTime(nowUnix() + 3600);
    interval.value = 1;
    unit.value = 60;
    repeat.value = 1;
    isReminderAdded.value = false;
};

const load = loader.wrap(async () => {
    const { data } = await sendMessage<
        GetNoteReminderDataMessage,
        GetNoteReminderDataResponse
    >("notes", "getNoteReminderData", {
        data: { note_id: props.noteId },
        expect: "getNoteReminderDataResponse",
    });

    resetValues();
    if (!data) {
        return;
    }

    isReminderAdded.value = true;
    isDataLoaded.value = true;
    if (data.interval) {
        tab.value = "repeat";
        unit.value = data.unit_value!;
        interval.value = data.interval;
        repeat.value = data.repeat_count;
    } else {
        tab.value = "once";
        date.value = timeFormat.formatIsoDate(data.next_at);
        time.value = timeFormat.formatIsoTime(data.next_at);
    }
});

const removeReminder = async () => {
    await sendMessage<RemoveReminderMessage, RemoveReminderResponse>(
        "notes",
        "removeReminder",
        { data: { note_id: props.noteId }, expect: "removeReminderResponse" },
    );
    toastStore.addMessage({
        type: "warning",
        text: "Reminder removed successfully.",
    });
};

const buildReminder = (): SetReminderMessage["reminder"] =>
    tab.value === "repeat"
        ? {
              type: "repeat",
              interval: interval.value,
              unit_value: unit.value,
              repeat_count: repeat.value,
          }
        : {
              type: "once",
              next_at: toUnix(new Date(`${date.value} ${time.value}`)),
          };

// The window stays open while the entered date or interval is invalid; the
// original closed it and dropped the reminder silently.
const save = async () => {
    const errors =
        tab.value === "repeat"
            ? validateRepeat(interval.value, repeat.value)
            : validateDateTime(date.value, time.value);
    if (isReminderAdded.value && errors.length > 0) {
        return;
    }

    try {
        if (!isReminderAdded.value) {
            await removeReminder();
            return;
        }

        await sendMessage<SetReminderMessage, SetReminderResponse>(
            "notes",
            "setReminder",
            {
                data: { note_id: props.noteId, reminder: buildReminder() },
                expect: "setReminderResponse",
            },
        );
        toastStore.addMessage({
            type: "success",
            text: "Reminder set successfully.",
        });
    } catch (error) {
        toastStore.reportError(error, "Failed to set reminder. Reason: ");
    }
    emit("close");
};

const selectPreset = (nextAt: number) => {
    date.value = timeFormat.formatIsoDate(nextAt);
    time.value = timeFormat.formatIsoTime(nextAt);
    void save();
};

const removeExisting = async () => {
    isReminderAdded.value = false;
    if (isDataLoaded.value) {
        await removeReminder();
        emit("close");
    }
};

onMounted(load);
</script>

<template>
    <Dialog
        icon="alarm"
        can-cancel
        title="Note Reminder"
        class="md:w-3/4 lg:w-2/4 max-md:w-full"
        @cancel="emit('close')"
    >
        <div v-if="loader.running.value">
            <span class="skeleton h-9 w-96 max-w-full rounded-lg mb-2" />
            <Skeleton :count="3" class="py-5 mb-2" />
        </div>
        <div v-else-if="!isReminderAdded" class="mb-4">
            <div class="py-5">
                <NoItemMessage icon="alarm">No reminder set.</NoItemMessage>
            </div>
        </div>
        <template v-else>
            <div class="mb-2">
                <ButtonGroup
                    :items="tabs"
                    :active-item="tab"
                    @select="tab = $event"
                />
            </div>
            <div class="mb-2 py-5">
                <QuickPickReminder
                    v-if="tab === 'preset'"
                    @preset-selected="selectPreset"
                />
                <OneTimeReminder
                    v-else-if="tab === 'once'"
                    v-model:date="date"
                    v-model:time="time"
                />
                <RepeatReminder
                    v-else
                    v-model:interval="interval"
                    v-model:unit="unit"
                    v-model:repeat="repeat"
                />
            </div>
        </template>

        <template #footer>
            <Button @click="emit('close')">Close</Button>
            <Button
                v-if="tab !== 'preset' && !loader.running.value"
                color="success"
                @click="save"
            >
                Save
            </Button>
            <Button
                v-if="isDataLoaded && isReminderAdded"
                color="danger"
                @click="removeExisting"
            >
                Remove Reminder
            </Button>
            <Button
                v-else-if="!isReminderAdded && !loader.running.value"
                color="success"
                @click="isReminderAdded = true"
            >
                Set reminder
            </Button>
        </template>
    </Dialog>
</template>
