<script setup lang="ts" generic="T">
import FormField from "./FormField.vue";
import type { ValidationState } from "@/composables/useValidation";

// Options are addressed by index so any value
// type works.
const props = withDefaults(
    defineProps<{
        items: { value: T; label: string }[];
        label?: string;
        name?: string;
        disabled?: boolean;
        tabIndex?: number;
        validation?: ValidationState;
        path?: string;
    }>(),
    {
        label: undefined,
        name: undefined,
        disabled: false,
        tabIndex: undefined,
        validation: undefined,
        path: undefined,
    },
);

const model = defineModel<T>();

const handleInput = (event: Event) => {
    const item = props.items[+(event.target as HTMLSelectElement).value];
    if (item) {
        model.value = item.value;
    }
};
</script>

<template>
    <FormField
        :label="label"
        :name="name"
        :validation="validation"
        :path="path"
    >
        <select
            :name="name"
            :tabindex="tabIndex"
            :value="items.findIndex((item) => item.value === model)"
            :disabled="disabled"
            class="form-field select-input"
            @input="handleInput"
        >
            <option v-for="(item, index) in items" :key="index" :value="index">
                {{ item.label }}
            </option>
        </select>
    </FormField>
</template>
