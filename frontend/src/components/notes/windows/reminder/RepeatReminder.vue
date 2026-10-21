<script setup lang="ts">
import { computed } from "vue";
import DropdownList from "@/components/DropdownList.vue";
import Input from "@/components/Input.vue";
import { validateRepeat } from "@/lib/reminder-validation";

const unitList = [
    { label: "minute(s)", value: 60 },
    { label: "hour(s)", value: 3600 },
    { label: "day(s)", value: 86400 },
    { label: "week(s)", value: 604800 },
    { label: "month(s)", value: 2592000 },
    { label: "year(s)", value: 31536000 },
];

const interval = defineModel<number>("interval", { required: true });
const unit = defineModel<number>("unit", { required: true });
const repeat = defineModel<number>("repeat", { required: true });

const errors = computed(() => validateRepeat(interval.value, repeat.value));
</script>

<template>
    <p class="py-2">How often should we remind you?</p>
    <div class="flex flex-wrap">
        <div class="basis-1/6 max-md:basis-1/2">
            <Input
                type="number"
                label="Every"
                min="1"
                :model-value="String(interval)"
                @update:model-value="(value) => (interval = parseFloat(value))"
            />
        </div>
        <div class="basis-1/5 pl-2 max-md:basis-1/2">
            <DropdownList v-model="unit" label="Of" :items="unitList" />
        </div>
        <div class="basis-1/4 md:pl-5 max-md:pt-2 max-md:basis-full">
            <Input
                type="number"
                label="How many times?"
                min="1"
                :model-value="String(repeat)"
                @update:model-value="(value) => (repeat = parseFloat(value))"
            />
        </div>
    </div>
    <div v-if="errors.length > 0" class="text-sm text-danger">
        <div v-for="error in errors" :key="error">{{ error }}</div>
    </div>
</template>
