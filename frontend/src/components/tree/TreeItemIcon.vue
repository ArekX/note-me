<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import type { TreeNode } from "@/stores/tree";

withDefaults(
    defineProps<{ node: TreeNode; isOpen?: boolean; addClass?: string }>(),
    { isOpen: false, addClass: "" },
);
</script>

<template>
    <div :class="['relative inline-block', addClass]">
        <div v-if="node.is_protected" class="absolute -bottom-1 right-0">
            <Icon name="lock-alt" type="solid" size="sm" />
        </div>
        <Icon
            :name="
                node.type === 'group'
                    ? `folder${isOpen ? '-open' : ''}`
                    : 'file'
            "
            :type="
                node.type === 'group' && node.has_children ? 'solid' : 'regular'
            "
        />
    </div>
</template>
