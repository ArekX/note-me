<script setup lang="ts">
import HelpAction from "@/components/help/HelpAction.vue";
import OnboardingDialog from "./OnboardingDialog.vue";
</script>

<template>
    <OnboardingDialog
        onboarding-key="edit_note_introduction_dismissed"
        title="Editing your notes"
    >
        <template #default="{ close }">
            <p>
                This is the note editor. Here you can edit the contents of your
                note.
            </p>

            <h1>Markdown</h1>
            <p>
                All notes are written using markdown syntax. While it is not
                strictly necessary to know Markdown to use NoteMe and you can
                use it to write plain text notes, knowing Markdown can help and
                allow you to take full advantage of NoteMe's features. Check
                <HelpAction page="markdown-syntax" @opened="close">
                    help to see all supported markdown features</HelpAction
                >.
            </p>

            <h1>Seeing how your changes look</h1>
            <p>
                You can preview your changes by clicking on the eye icon above
                the toolbar or by pressing the Ctrl+E combination.
            </p>

            <h1>Inserting content</h1>
            <p>
                The toolbar above the text formats your text and inserts links,
                images, tables, files, note lists, note links and a table of
                contents.
            </p>

            <h1>Doing things faster</h1>
            <p>
                NoteMe has a number of keyboard shortcuts to help you work
                faster to insert bold text, add templates and more. Visit help
                for the
                <HelpAction page="keyboard-shortcuts" @opened="close">
                    full list of shortcuts</HelpAction
                >.
            </p>

            <h1>Files</h1>
            <p>
                NoteMe supports adding files to the notes which can be shown as
                images or used as links to download the file. Files can be added
                with the file button of the toolbar, dropping them into the text
                area or by pasting them from the clipboard.
            </p>

            <h1>History</h1>
            <p>
                Every time a note is saved after creation, NoteMe records the
                previous version of the note in the history. Check
                <HelpAction page="note-history" @opened="close">
                    note history</HelpAction
                >
                in help for more information.
            </p>

            <h1>Protecting your notes</h1>
            <p>
                Notes can be protected so that you are the only person who has
                access to their content. Notes are encrypted in the database
                with your password. Check
                <HelpAction page="protecting-notes" @opened="close">
                    protecting notes</HelpAction
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
