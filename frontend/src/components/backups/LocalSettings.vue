<script setup lang="ts">
import Input from "@/components/Input.vue";
import type { ValidationState } from "@/composables/useValidation";
import type { LocalBackupSettingsRequest } from "@/schemas/settings";

defineProps<{ validation: ValidationState }>();
const settings = defineModel<LocalBackupSettingsRequest>({ required: true });
</script>

<template>
    <div class="py-2">
        <Input
            v-model="settings.location"
            label="Location"
            :validation="validation"
            path="settings.location"
        />
        <div class="text-xs text-muted pt-1.5">
            Absolute path is needed. Make sure that this location on the server
            is accessible and writable by the application. Application will
            attempt to create the directory structure if it does not exist and
            application has permission to do so.
        </div>
    </div>
</template>
