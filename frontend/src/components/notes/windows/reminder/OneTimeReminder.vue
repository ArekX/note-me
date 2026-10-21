<script setup lang="ts">
import { computed } from "vue";
import Input from "@/components/Input.vue";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { validateDateTime } from "@/lib/reminder-validation";

const date = defineModel<string>("date", { required: true });
const time = defineModel<string>("time", { required: true });

const errors = computed(() => validateDateTime(date.value, time.value));
const today = useTimeFormat().formatIsoDate(new Date());
</script>

<template>
    <p class="py-2">When should we remind you?</p>
    <div class="flex flex-wrap">
        <div class="basis-1/3 max-md:basis-full">
            <Input v-model="date" type="date" label="At Date" :min="today" />
        </div>
        <div class="basis-1/3 md:pl-2 max-md:pt-2 max-md:basis-full">
            <Input v-model="time" type="time" label="At Time" />
        </div>
    </div>
    <div v-if="errors.length > 0" class="text-sm text-danger">
        <div v-for="error in errors" :key="error">{{ error }}</div>
    </div>
</template>
