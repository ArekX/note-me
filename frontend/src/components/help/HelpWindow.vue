<script setup lang="ts">
import { computed } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import SideTabPanel, { type PanelItem } from "@/components/SideTabPanel.vue";
import { useResponsiveQuery } from "@/composables/useResponsiveQuery";
import { useHelpStore } from "@/stores/help";
import { useUserStore } from "@/stores/user";
import { canSeeHelpTopic, helpTopics } from "./help-topics";

const help = useHelpStore();
const userStore = useUserStore();
const query = useResponsiveQuery();

const panels = computed(() =>
    helpTopics.filter((topic) => canSeeHelpTopic(topic, userStore)),
);

const selectedIndex = computed(() =>
    Math.max(
        0,
        panels.value.findIndex((panel) => panel.key === help.page),
    ),
);

const select = (_item: PanelItem, index: number) => {
    help.open(panels.value[index]!.key);
};
</script>

<template>
    <Dialog
        v-if="help.isOpen"
        can-cancel
        title="Help"
        icon="help-circle"
        class="dialog-wide"
        @cancel="help.close()"
    >
        <div class="py-2">
            <SideTabPanel
                :items="panels"
                :selected-index="selectedIndex"
                toggle-label="Topics"
                add-panel-class="onboarding-contents"
                @select="select"
            />
        </div>
        <template v-if="!query.isMobile()" #footer>
            <Button @click="help.close()">Close</Button>
        </template>
    </Dialog>
</template>
