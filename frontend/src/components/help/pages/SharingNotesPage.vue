<script setup lang="ts">
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Sharing notes</h1>

        <p>
            Notes can be shared between users or they can be shared with anyone
            outside of NoteMe. To share a note, click on Share menu either on
            the note in the menu in the sidebar or on the top right menu of the
            note. Notes can only be shared to other people in read-only mode
            since they can only be edited by you.
        </p>

        <p>
            Sharing a note with users will send them a notification that you
            have shared a note with them. Sharing a note with everyone creates a
            custom link which will be shown to anyone who has that link. When
            creating a link you can also set the expiration date after which the
            link will no longer work. A note can have multiple share links so
            that you can create links with different expiration dates or no
            expiration date at all.
        </p>

        <p>
            If you share a protected note, that note cannot be opened by anyone
            you shared it to as it is protected by your password.
        </p>

        <p>
            Please note that sharing a note will not automatically share all
            note files. This is done for security reasons as files can contain
            sensitive information. If you want to share files as well you will
            need to make them public. You can either do this by visiting
            <HelpLink :to="{ name: 'profile-files' }">
                files in your profile</HelpLink
            >
            or by using the Files feature in the upper right menu of the note.
            Files feature shows you which files are added to the note and allows
            you to make them all public or private.
        </p>
    </div>
</template>
