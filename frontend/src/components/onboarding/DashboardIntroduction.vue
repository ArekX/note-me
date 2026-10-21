<script setup lang="ts">
import { RouterLink } from "vue-router";
import Icon from "@/components/Icon.vue";
import HelpAction from "@/components/help/HelpAction.vue";
import OnboardingDialog from "./OnboardingDialog.vue";
</script>

<template>
    <OnboardingDialog
        onboarding-key="introduction_dismissed"
        title="Welcome to NoteMe!"
    >
        <template #default="{ close }">
            <p>
                NoteMe is a simple, note-taking app with powerful features which
                help to keep the ownership of your notes and keep them organized
                however you see fit.
            </p>
            <p>
                Notes are shown in the sidebar on the left, clicking on a
                specific note will open it in view mode where you can see its
                contents. On the same sidebar you can also organize notes by
                dragging them into groups or subgroups.
            </p>
            <p>
                This page shows general information about your notes like what
                notes you have recently opened, notes you have upcoming
                reminders for and notes shared with you.
            </p>
            <p>
                Your profile, files, data and help are in the user menu: click
                your initials at the bottom of the left rail, on a phone also at
                the right end of the bottom bar.
            </p>
            <p>
                For more help, open
                <HelpAction @opened="close">Help</HelpAction>
                from your user menu.
            </p>
            <p>
                Add your first note by clicking on the
                <RouterLink :to="{ name: 'note-new' }" @click="close">
                    <Icon name="plus" size="4xl" />
                </RouterLink>
                icon in the list on the left.
            </p>
            <p>Have fun using NoteMe!</p>
        </template>
    </OnboardingDialog>
</template>
