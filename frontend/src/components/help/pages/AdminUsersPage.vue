<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Users</h1>

        <p>
            <HelpLink :to="{ name: 'settings-users' }">
                Settings → Users</HelpLink
            >
            lists every account, 20 per page. Filter it by name, username or
            role.
        </p>

        <p>There are two roles:</p>
        <ul class="list-disc pl-5">
            <li>
                <strong>Admin</strong>: everything a user can do, plus every
                screen in Settings (backups, periodic tasks, users, tags, all
                files, audit log and server log).
            </li>
            <li>
                <strong>User</strong>: their own notes, groups, files and
                profile. Users cannot open Settings.
            </li>
        </ul>

        <h1>Adding a user</h1>

        <p>
            Add asks for a username, name, timezone, role and password (8 to 128
            characters). The username cannot be changed later and must not be
            taken. The user has to choose a new password at the first sign-in.
        </p>

        <h1>Editing a user</h1>

        <p>
            The pencil icon changes the name, timezone and role, and can set a
            new password. Changes reach the user's open tabs right away. Setting
            a new password also gives the user a new key for protected notes, so
            the notes they protected with the old password can no longer be
            opened, and they have to choose a new password at the next sign-in.
        </p>

        <p>
            Your own role and password cannot be changed here; change your
            password in your profile. The last administrator cannot be turned
            into a user.
        </p>

        <h1>Deleting a user</h1>

        <p>
            Deleting a user is permanent and cannot be undone. It removes their
            notes with their history, reminders and shares, their groups, their
            uploaded files (also from disk), notifications, sessions and
            passkeys, and signs them out of every open tab. Tags they created
            stay if other notes still use them and are handed over to you;
            unused ones are deleted. Notes they shared with others disappear for
            those users too.
        </p>

        <p>
            You cannot delete your own account or the last administrator. If the
            data might still be needed, make a manual backup first.
        </p>

        <p>
            Creating, changing and deleting users is recorded in the
            <HelpAction page="admin-audit-log" class="link">
                audit log</HelpAction
            >, and those entries stay after the user is deleted.
        </p>
    </div>
</template>
