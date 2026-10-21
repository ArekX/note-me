<script setup lang="ts">
import HelpAction from "../HelpAction.vue";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Backups</h1>

        <p>
            A backup is one ZIP file with the whole database and every uploaded
            file, encrypted with the server's
            <code>BACKUP_ENCRYPTION_KEY</code>. Sign-in sessions are never part
            of a backup, so everyone has to sign in again after a restore.
            Backups are managed in
            <HelpLink :to="{ name: 'settings' }">Settings → Backups</HelpLink>.
        </p>

        <p>
            When <code>MAX_ALLOWED_BACKUP_COUNT</code> is 0, backups are
            disabled and the screen only says so.
        </p>

        <h1>Backup targets</h1>

        <p>
            A target is a place where backups are stored. Create one with New
            target and choose its type:
        </p>
        <ul class="list-disc pl-5">
            <li>
                <strong>Local</strong>: a folder inside the server's
                <code>LOCAL_BACKUP_ROOT_LOCATION</code>. The location is a
                folder name or a relative path inside that root; absolute paths
                are refused. The folder is created if it does not exist.
            </li>
            <li>
                <strong>AWS S3 Bucket</strong>: a bucket, its region and an
                optional prefix (folder) for the backups. If NoteMe runs on AWS
                it can use its IAM role, otherwise turn on Use access keys. The
                keys are stored in the database, and so in every backup; use
                keys that can only read, write, delete and list in this bucket.
                The secret is never shown again; leave it empty when editing to
                keep the stored one.
            </li>
        </ul>

        <p>
            The cog icon opens a target. Configure changes its settings and
            Backup List shows the backups stored in it, with their size and
            time, a download and a delete button, and Create manual backup. A
            target cannot be changed or deleted while a backup to it is running.
            Deleting a target does not delete the backups already stored in it;
            deleting a backup removes it for good.
        </p>

        <h1>Automatic and manual backups</h1>

        <p>
            Every night at midnight (UTC) the
            <HelpAction page="admin-periodic-tasks" class="link">
                periodic task</HelpAction
            >
            Back up the database makes one backup and stores it in every target.
            Each target keeps at most <code>MAX_ALLOWED_BACKUP_COUNT</code>
            automatic backups; older ones are deleted. A target that fails does
            not stop the others, and the failure shows in the periodic task
            list.
        </p>

        <p>
            Manual backups are made right away for one target and are never
            deleted automatically. Use them before an upgrade or to keep more
            backups than the limit allows.
        </p>

        <h1>Restoring a backup</h1>

        <p>
            Restoring happens on the server, not in the app. Download the
            backup, stop NoteMe and run
            <code
                >noteme-cli restore-backup --overwrite
                &lt;backup.zip.enc&gt;</code
            >
            with the same <code>DATABASE_DSN</code>,
            <code>FILES_LOCATION</code> and <code>BACKUP_ENCRYPTION_KEY</code>
            as the server, then start NoteMe again. The restore replaces the
            database; uploaded files that are not in the backup stay. A backup
            restores into SQLite, PostgreSQL or MySQL, whichever database made
            it.
        </p>

        <p>
            A backup can only be restored with the key that encrypted it. Keep a
            copy of <code>BACKUP_ENCRYPTION_KEY</code> somewhere other than the
            server, or the backups are useless when the server is lost.
        </p>

        <p>
            Changes to targets and every backup created, deleted or downloaded
            are recorded in the
            <HelpAction page="admin-audit-log" class="link">
                audit log</HelpAction
            >.
        </p>
    </div>
</template>
