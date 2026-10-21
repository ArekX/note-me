<script setup lang="ts">
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Files</h1>

        <p>
            Files can be uploaded into NoteMe and then can be used directly in
            notes as images or links to download them. Once a file is uploaded
            it can be used in any of your own notes.
        </p>

        <p>
            Every uploaded file is private by default, meaning that only you can
            see it. If you want to share a file with others you can make it
            public by clicking on the eye icon on the file in the
            <HelpLink :to="{ name: 'profile-files' }">
                file list in your profile</HelpLink
            >.
        </p>

        <p>
            Uploaded files are not encrypted even if the note itself is
            protected. This is because files can be used in both protected and
            unprotected notes.
        </p>

        <p>
            When inserting files into notes you can insert more of them by
            holding the Ctrl key while clicking on the files. This will insert
            all selected files into the note at once.
        </p>

        <p>
            The file list and the insert dialog have the same search, type and
            visibility filters, and both can show the files as a grid of
            previews or as a list; the icons next to the filters switch between
            them. The insert dialog starts as a grid, the file lists in your
            profile and in Settings start as a list.
        </p>
    </div>
</template>
