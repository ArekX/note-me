<script setup lang="ts">
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Audit log</h1>

        <p>
            The
            <HelpLink :to="{ name: 'settings-audit-log' }">audit log</HelpLink>
            records security events of the last year; the daily task Clean up
            the audit log deletes older entries. It is read-only, and entries
            stay when the user they mention is deleted. Passwords are never
            recorded.
        </p>

        <p>
            Each entry shows when it happened, the event, the user, the address
            the request came from and details such as the affected user, file or
            backup. Failures and lockouts are shown in red. The newest entries
            come first, 20 per page. Filter by event, username or a range of
            days.
        </p>

        <p>Recorded events:</p>
        <ul class="list-disc pl-5">
            <li>
                Sign-in: <code>login_succeeded</code>,
                <code>login_failed</code>, <code>passkey_login_succeeded</code>,
                <code>passkey_login_failed</code>, <code>logout</code>, and
                <code>login_locked</code> when one address made too many sign-in
                attempts.
            </li>
            <li>
                Account: <code>password_changed</code>,
                <code>passkey_registered</code>, <code>passkey_deleted</code>,
                and <code>password_attempts_locked</code> when a user entered a
                wrong password <code>MAX_PASSWORD_ATTEMPTS</code> times (for
                protected notes, password change, passkeys or export), which
                locks those checks for 24 hours.
            </li>
            <li>
                Users: <code>user_created</code>, <code>user_updated</code>,
                <code>user_deleted</code>.
            </li>
            <li>
                Backups: <code>backup_target_created</code>,
                <code>backup_target_updated</code>,
                <code>backup_target_deleted</code>, <code>backup_created</code>,
                <code>backup_deleted</code>, <code>backup_downloaded</code>.
            </li>
            <li>
                Tags and files: <code>tag_updated</code>,
                <code>tag_deleted</code>,
                <code>file_visibility_changed_by_admin</code>,
                <code>file_deleted_by_admin</code>.
            </li>
            <li>
                AI: <code>ai_provider_created</code>,
                <code>ai_provider_updated</code>,
                <code>ai_provider_deleted</code>,
                <code>ai_default_provider_changed</code>,
                <code>ai_access_changed</code>.
            </li>
            <li>
                MCP clients: <code>mcp_client_created</code>,
                <code>mcp_client_updated</code>,
                <code>mcp_client_deleted</code>,
                <code>mcp_client_secret_regenerated</code>,
                <code>mcp_consent_given</code> (a user allowed an app to
                connect), <code>mcp_token_refused</code> (an unknown or revoked
                token), <code>mcp_client_auth_failed</code> (a wrong client
                secret) and <code>mcp_refresh_token_reused</code> (a refresh
                token used twice, which disconnects every app of that client).
            </li>
            <li>
                Periodic tasks: <code>periodic_task_run_requested</code> (an
                administrator ran a task with Run now).
            </li>
        </ul>

        <p>
            Behind a reverse proxy the address is the proxy's unless the proxy
            is listed in <code>TRUSTED_PROXIES</code>.
        </p>
    </div>
</template>
