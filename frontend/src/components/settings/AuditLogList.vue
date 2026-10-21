<script setup lang="ts">
import { onMounted, ref } from "vue";
import Badge from "@/components/Badge.vue";
import DropdownList from "@/components/DropdownList.vue";
import Input from "@/components/Input.vue";
import PageHeader from "@/components/PageHeader.vue";
import Pagination from "@/components/Pagination.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useFilters } from "@/composables/useFilters";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useTimeFormat } from "@/composables/useTimeFormat";
import { toUnix } from "@/lib/unix-time";
import { useSettingsStore } from "@/stores/settings";
import { useToastStore } from "@/stores/toast";
import type { AuditLogFilters, AuditLogRecord } from "@/types/records";

interface FilterForm {
    event: string;
    username: string;
    from: string;
    to: string;
}

const DAY = 86400;

const settingsStore = useSettingsStore();
const timeFormat = useTimeFormat();
const loader = useLoader(true);
const records = usePagedData<AuditLogRecord>(() => load());
const events = ref<string[]>([]);

const columns: TableColumn<AuditLogRecord>[] = [
    { id: "time", name: "Time", cellClass: "whitespace-nowrap" },
    { id: "event", name: "Event" },
    { id: "user", name: "User" },
    { id: "address", name: "Address", cellClass: "font-mono text-xs" },
    { id: "details", name: "Details" },
];

const isDangerEvent = (event: string) => /fail|lock|denied|error/i.test(event);

// Date filters are whole days; a date-only string parses as UTC midnight.
const toRequestFilters = (form: FilterForm): AuditLogFilters => ({
    ...(form.event && { event: form.event }),
    ...(form.username && { username: form.username }),
    ...(form.from && { from: toUnix(new Date(form.from)) }),
    ...(form.to && { to: toUnix(new Date(form.to)) + DAY - 1 }),
});

const load = loader.wrap(async () => {
    try {
        const response = await settingsStore.loadAuditLog(
            toRequestFilters(filters.value),
            records.page.value,
        );
        records.setPagedData(response.records);
        events.value = response.events;
    } catch (error) {
        useToastStore().reportError(error);
    }
});

const { filters, setFilter } = useFilters<FilterForm>({
    initialFilters: () => ({ event: "", username: "", from: "", to: "" }),
    onFilterLoad: () => records.loadFirstPage(),
});

const eventItems = () => [
    { label: "All events", value: "" },
    ...events.value.map((event) => ({ label: event, value: event })),
];

const detailValue = (value: unknown) =>
    typeof value === "string" ? value : JSON.stringify(value);

onMounted(load);
</script>

<template>
    <div>
        <PageHeader title="Audit log" help="admin-audit-log">
            Security events of the last year: logins and their failures,
            lockouts, password changes and administrative actions.
        </PageHeader>

        <div class="flex flex-wrap gap-2 mb-4">
            <DropdownList
                class="w-52 max-md:grow"
                :model-value="filters.event"
                :items="eventItems()"
                @update:model-value="(value) => setFilter('event', value ?? '')"
            />
            <Input
                icon="user"
                class="grow min-w-40"
                :model-value="filters.username"
                placeholder="Search username"
                @update:model-value="(value) => setFilter('username', value)"
            />
            <Input
                type="date"
                class="w-44 max-md:grow"
                :model-value="filters.from"
                @update:model-value="(value) => setFilter('from', value)"
            />
            <Input
                type="date"
                class="w-44 max-md:grow"
                :model-value="filters.to"
                :min="filters.from || undefined"
                @update:model-value="(value) => setFilter('to', value)"
            />
        </div>

        <Table
            :columns="columns"
            :rows="records.results.value"
            :is-loading="loader.running.value"
            :row-key="(row) => row.id"
            no-rows-text="No audit log entries found."
        >
            <template #cell-time="{ row }">
                <TimeAgo :time="row.created_at" />
                <div class="text-xs text-muted">
                    {{ timeFormat.formatDateTime(row.created_at) }}
                </div>
            </template>
            <template #cell-event="{ row }">
                <Badge :tone="isDangerEvent(row.event) ? 'danger' : 'neutral'">
                    {{ row.event }}
                </Badge>
            </template>
            <template #cell-user="{ row }">
                {{ row.username ?? "–" }}
            </template>
            <template #cell-address="{ row }">
                {{ row.address ?? "–" }}
            </template>
            <template #cell-details="{ row }">
                <ul class="text-xs text-muted">
                    <li
                        v-for="[key, value] in Object.entries(row.details)"
                        :key="key"
                    >
                        <span class="font-mono">{{ key }}</span
                        >: {{ detailValue(value) }}
                    </li>
                </ul>
            </template>
        </Table>

        <Pagination
            v-if="!loader.running.value"
            :total="records.total.value"
            :per-page="records.perPage.value"
            :current-page="records.page.value"
            @change="records.changePage"
        />
    </div>
</template>
