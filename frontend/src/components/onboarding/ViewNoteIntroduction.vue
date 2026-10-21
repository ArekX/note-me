<script setup lang="ts">
import HelpAction from "@/components/help/HelpAction.vue";
import OnboardingDialog from "./OnboardingDialog.vue";
</script>

<template>
    <OnboardingDialog
        onboarding-key="view_note_introduction_dismissed"
        title="Viewing your notes"
    >
        <template #default="{ close }">
            <p>
                This is a view page for your note. Here you can see your note
                rendered from the
                <HelpAction page="markdown-syntax" @opened="close">
                    markdown syntax</HelpAction
                >.
            </p>

            <h1>Searching</h1>
            <p>
                If your note contains tags, you can click on the tag to find all
                notes with the same tag in the sidebar on the left.
            </p>
            <p>
                If your note is organized in a group, the group name will appear
                below the note title. You can click on the group name to search
                all notes in that group or its subgroups.
            </p>

            <h1>Sharing</h1>
            <p>
                Notes can be shared with other users or everyone by creating a
                public link. Check
                <HelpAction page="sharing-notes" @opened="close">
                    note sharing</HelpAction
                >
                in help for more information.
            </p>

            <h1>Reminders</h1>
            <p>
                If you need to be reminded about this note later, you can set a
                one-time or recurring reminder. Check
                <HelpAction page="setting-reminders" @opened="close">
                    setting reminders</HelpAction
                >
                in help for more information.
            </p>

            <p>
                For more help, open
                <HelpAction @opened="close">Help</HelpAction>
                from your user menu.
            </p>
        </template>
    </OnboardingDialog>
</template>
