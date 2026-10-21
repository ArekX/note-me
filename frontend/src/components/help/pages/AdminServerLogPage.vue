<script setup lang="ts">
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Server log</h1>

        <p>
            The
            <HelpLink :to="{ name: 'settings-server-log' }"
                >server log</HelpLink
            >
            shows the last 1000 lines the server wrote to its log. They are kept
            in memory only, so earlier lines are gone after a restart; the full
            log goes to the server's standard error output (the container log in
            Docker).
        </p>

        <p>
            The list refreshes every 10 seconds and follows the newest lines.
            Scroll up to stop following while you read; scroll back to the
            bottom to follow again. Refresh reloads it at once.
        </p>

        <p>
            How much is logged is set by
            <code>LOGGING_LEVEL</code> (<code>DEBUG</code>, <code>INFO</code>,
            <code>WARN</code> or <code>ERROR</code>). Look here when a backup or
            a periodic task fails or something does not work as expected.
        </p>
    </div>
</template>
