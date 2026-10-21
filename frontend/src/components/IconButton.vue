<script setup lang="ts">
import Button from "./Button.vue";
import Icon from "./Icon.vue";

withDefaults(
    defineProps<{
        icon: string;
        title: string;
        danger?: boolean;
        addClass?: string;
    }>(),
    { danger: false, addClass: "" },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
    <Button
        :color="danger ? 'transparentDanger' : 'transparent'"
        size="sm"
        :title="title"
        :add-class="addClass"
        @click="emit('click', $event)"
    >
        <Icon :name="icon" size="lg" />
    </Button>
</template>
