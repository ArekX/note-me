<script setup lang="ts">
import { periodicTasks } from "@/lib/periodic-tasks";
import HelpLink from "../HelpLink.vue";
</script>

<template>
    <div>
        <h1>Periodic tasks</h1>

        <p>
            Periodic tasks are background jobs the server runs on a schedule.
            <HelpLink :to="{ name: 'settings-periodic-tasks' }">
                Settings → Tasks</HelpLink
            >
            shows their state; the tasks cannot be started or changed there. All
            schedules are in UTC.
        </p>

        <ul class="list-disc pl-5">
            <li v-for="(task, identifier) in periodicTasks" :key="identifier">
                <strong>{{ task.name }}</strong> ({{ task.schedule }}):
                {{ task.description }}
            </li>
        </ul>

        <p>
            For each task the list shows when it runs next, the outcome of its
            last run (No runs yet, Successful or Failed), when it last succeeded
            and when it last failed, with the reason. The list refreshes every
            10 seconds; Refresh reloads it at once.
        </p>

        <p>
            The eye icon opens the task's runs of the last days, page by page:
            when each run happened, its outcome, how long it took and why it
            failed. The number of days is set by
            <code>PERIODIC_TASK_HISTORY_DAYS</code> (30 by default); older runs
            are removed automatically.
        </p>

        <p>
            The play icon runs a task right away: it becomes due a second later
            and runs like a scheduled run, so it shows in the task's runs and
            its next scheduled run follows from then. Only administrators see
            it, and every use is recorded in the audit log.
        </p>

        <p>
            A run missed while the server was down runs once as soon as it
            starts again, and a run cut off by a shutdown runs again after the
            restart. When a task keeps failing, the
            <HelpLink :to="{ name: 'settings-server-log' }"
                >server log</HelpLink
            >
            usually has more detail.
        </p>
    </div>
</template>
