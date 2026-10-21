<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Files</h1>

        <p>
            <HelpLink :to="{ name: 'settings-files' }">
                Settings → Files</HelpLink
            >
            lists the files every user uploaded, with their size, owner, upload
            time and visibility. Filter by name, owner, type (images, documents,
            other) or visibility; Clear removes the filters. For how users work
            with files, see
            <HelpAction page="note-files" class="link">Files</HelpAction>.
        </p>

        <h1>Uploading</h1>

        <p>
            Upload opens the Upload files dialog: choose or drop several files,
            check the list (name and size), remove the ones you do not want or
            clear them all, then upload. The dialog then shows the progress of
            each file and whether it was uploaded or failed, with the reason.
            Dropping files onto the page opens the same dialog with them added.
            Files you upload here belong to you.
        </p>

        <p>
            A single file can be at most <code>MAX_FILE_SIZE</code> (50 MB by
            default), and all files of one user together at most
            <code>MAX_USER_STORAGE_SIZE</code> (0, the default, means no limit).
        </p>

        <h1>Visibility</h1>

        <p>
            The eye icon shows a file's details and a preview. Make public lets
            anyone with the file's link open it, also without signing in. Make
            private limits it to its owner again (administrators can still open
            it).
        </p>

        <h1>Deleting</h1>

        <p>
            Deleting a file removes it from the server for good, whoever
            uploaded it. Notes that show or link to the file keep the link, but
            it no longer works: images stay empty and downloads fail. This
            cannot be undone except by restoring a backup.
        </p>

        <h1>Several files at once</h1>

        <p>
            Tick the checkboxes of the files you want, or the checkbox in the
            header to select every file on the current page. A bar above the
            table then lets you make the selected files public or private,
            delete them (after a confirmation) or clear the selection.
        </p>

        <p>
            Visibility changes and deletes made here are recorded in the
            <HelpAction page="admin-audit-log" class="link">
                audit log</HelpAction
            >.
        </p>
    </div>
</template>
