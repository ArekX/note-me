<script setup lang="ts">
import { computed, ref } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import DropdownMenu from "@/components/DropdownMenu.vue";
import Icon from "@/components/Icon.vue";
import {
    insertComponents,
    type InsertButton,
    type InsertComponentId,
} from "./insert/insert-components";

// initialData reopens the dialog on what an inserted item already shows.
const props = defineProps<{
    itemId: InsertComponentId;
    initialData?: object | null;
}>();
const emit = defineEmits<{ insert: [text: string]; close: [] }>();

const insertData = ref<object | null>(props.initialData ?? null);

const item = computed(() =>
    insertComponents.find((component) => component.id === props.itemId)!,
);
const buttons = computed(() => Object.values(item.value.insertButtons));

const insert = (button: InsertButton) =>
    emit("insert", button.formatData(insertData.value as never));
</script>

<template>
    <Dialog
        can-cancel
        :title="`Insert ${item.name.toLowerCase()}`"
        :icon="item.icon"
        class="dialog-fit"
        @cancel="emit('close')"
    >
        <component
            :is="item.component"
            v-bind="initialData ? { initialData } : {}"
            @insert-data-change="(data: object | null) => (insertData = data)"
            @insert="(text: string) => emit('insert', text)"
        />

        <template #footer>
            <Button @click="emit('close')">Cancel</Button>
            <template v-if="insertData">
                <Button
                    v-if="buttons.length === 1"
                    color="success"
                    @click="insert(buttons[0]!)"
                >
                    <Icon :name="buttons[0]!.icon" /> {{ buttons[0]!.name }}
                </Button>
                <DropdownMenu
                    v-else
                    class="inline-block"
                    :items="
                        buttons.map((button) => ({
                            name: button.name,
                            icon: button.icon,
                            onClick: () => insert(button),
                        }))
                    "
                    inline-direction="top"
                    popover-id="insertItemDialog-0"
                >
                    <template #label>
                        <Icon name="list-ul" /> Insert as
                    </template>
                </DropdownMenu>
            </template>
        </template>
    </Dialog>
</template>
