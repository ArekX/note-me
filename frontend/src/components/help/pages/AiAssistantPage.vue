<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
</script>

<template>
    <div>
        <h1>AI assistant</h1>

        <p>
            When an administrator gives you access, the assistant opens from the
            <strong>AI</strong> icon on the left rail (on a phone: your user
            menu). It works with your notes, folders, reminders, sharing,
            notifications, files and help through the same actions you use in
            the app, with your own permissions. Everything it changes shows up
            right away, in every tab.
        </p>

        <h2>Conversations</h2>
        <ul class="list-disc pl-5">
            <li>
                Type in the box at the bottom and press Enter to send;
                Shift+Enter starts a new line. Sending from the list starts a
                new conversation; the assistant gives it a short title, which
                you can change.
            </li>
            <li>
                <strong>Stop</strong> ends an answer that is still being
                written; what was written so far is kept.
            </li>
            <li>
                Each answer lists the steps the assistant took. Open a step to
                see what it asked for and what came back.
            </li>
            <li>
                Conversations can be renamed and deleted from the list. They
                belong to you only and are part of the server's backups, but not
                of your data export.
            </li>
            <li>
                A conversation keeps the AI provider it started with. When your
                administrator moves you to another provider, older conversations
                can still be read but not continued.
            </li>
        </ul>

        <h2>Confirmations</h2>
        <p>
            Steps that cannot be undone or that reach other people, such as
            deleting something for good, deleting a folder, sharing a note or
            creating a public link, wait for you to press
            <strong>Allow</strong> or <strong>Deny</strong>. Reading and changes
            you can undo run at once. Tool results are only data for the
            assistant, but a note could still contain text that tries to steer
            it, so read what you allow.
        </p>

        <h2>What is sent to the AI provider</h2>
        <p>
            Your messages and whatever the assistant reads for you (note titles
            and text, file names, reminders, ...) are sent to the AI provider
            your administrator set up. Each message also says which page you
            have open (for a note, its number and title, not its text), so "this
            note" works. File contents are not read, and the assistant cannot
            upload files or change passwords.
        </p>
        <p>
            The assistant can start an export of your data. It opens the same
            confirmation as the <strong>Export my data</strong> button, asks for
            your password if protection is locked, and you download the file
            from the dialog yourself; the export never reaches the assistant.
        </p>
        <p>
            The assistant can change your preferred editor and list, add or
            remove your passkeys. Adding or removing a passkey always asks for
            your password first, even if you entered it a moment ago, and adding
            one then shows your device's own passkey prompt.
        </p>
        <p>
            Notes, tags and files it mentions are links: a note opens in the
            app, a tag searches your notes, and a file opens in a new tab.
        </p>

        <h2>Protected notes</h2>
        <p>
            The first time in a conversation the assistant needs the text of a
            <HelpAction page="protecting-notes" class="link"
                >protected note</HelpAction
            >, a dialog asks you to allow it, because that text will be sent to
            the AI provider. Your password is never sent to the AI. When
            protected notes are locked, the dialog asks for your password to
            unlock them. The permission lasts for that conversation in this tab;
            a reload or another tab asks again. The text of protected notes is
            not stored with the conversation.
        </p>
    </div>
</template>
