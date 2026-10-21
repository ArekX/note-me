<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div class="py-2">
        <h1>General</h1>

        <p>
            Notes are written using markdown. NoteMe supports all standard
            markdown features like headings, lists, links, images, code blocks,
            and more. You can check the full list of all
            <HelpAction page="markdown-syntax" class="link">
                supported markdown in this help section</HelpAction
            >.
        </p>

        <p>
            Notes can be created by clicking on the "New Note" button in the
            left side menu. If you wish to import one or more notes from your
            files, you can import them from
            <HelpLink :to="{ name: 'profile-data' }">data section</HelpLink>
            in your profile.
        </p>

        <p>
            Every note is directly tied to the user who created it, but notes
            can be shared with other users or publicly. Check
            <HelpAction page="sharing-notes" class="link">
                "Sharing Notes"</HelpAction
            >
            for more information.
        </p>

        <p>
            Notes can be organized into groups. Groups can be created by
            clicking on the "New Group" button in the left side menu. Notes can
            be moved between groups by dragging them to the desired group.
        </p>

        <p>
            You can download all notes as Markdown files by clicking on
            "Download" in the upper right menu of the note. If you wish to
            download all of your notes and files that can be done from the
            <HelpLink :to="{ name: 'profile-data' }">Data section</HelpLink> in
            your profile.
        </p>
    </div>
</template>
