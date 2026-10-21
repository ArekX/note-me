<script setup lang="ts">
import FormField from "./FormField.vue";
import Icon from "./Icon.vue";
import type { ValidationState } from "@/composables/useValidation";

withDefaults(
    defineProps<{
        type?: "text" | "number" | "password" | "email" | "date" | "time";
        label?: string;
        icon?: string;
        name?: string;
        min?: string;
        placeholder?: string;
        tabIndex?: number;
        disabled?: boolean;
        disableAutocomplete?: boolean;
        // A dialog's showModal() focuses it.
        autofocus?: boolean;
        validation?: ValidationState;
        path?: string;
    }>(),
    {
        type: "text",
        label: undefined,
        icon: undefined,
        name: undefined,
        min: undefined,
        placeholder: undefined,
        tabIndex: undefined,
        disabled: false,
        disableAutocomplete: false,
        autofocus: false,
        validation: undefined,
        path: undefined,
    },
);

const emit = defineEmits<{ keydown: [event: KeyboardEvent] }>();

const model = defineModel<string>({ default: "" });
</script>

<template>
    <FormField
        :label="label"
        :name="name"
        :validation="validation"
        :path="path"
    >
        <div class="relative">
            <div
                v-if="icon"
                class="absolute inset-y-0 left-0 flex items-center pl-3 text-muted pointer-events-none"
            >
                <Icon :name="icon" size="lg" />
            </div>
            <input
                v-model="model"
                :type="type"
                :name="name"
                :disabled="disabled"
                :tabindex="tabIndex"
                :autocomplete="disableAutocomplete ? 'off' : undefined"
                :autofocus="autofocus"
                :min="min"
                :placeholder="placeholder"
                :class="['form-field', icon ? 'pl-10' : '']"
                @keydown="emit('keydown', $event)"
            />
        </div>
    </FormField>
</template>
