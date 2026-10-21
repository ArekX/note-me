<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import DropdownList from "@/components/DropdownList.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import Input from "@/components/Input.vue";
import PageHeader from "@/components/PageHeader.vue";
import Pagination from "@/components/Pagination.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import EditUserForm, { type EditableUser } from "./EditUserForm.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useFilters } from "@/composables/useFilters";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useWebsocketService } from "@/composables/useWebsocketService";
import {
    CanManageAiProviders,
    CanManageUsers,
    roleDropDownList,
    roleLabelMap,
    type Role,
} from "@/lib/rbac";
import { initials } from "@/lib/initials";
import { resolveTimeZone } from "@/lib/time-zone";
import { useAiProvidersStore } from "@/stores/ai-providers";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type {
    DeleteUserMessage,
    DeleteUserResponse,
    FindUsersMessage,
    FindUsersResponse,
} from "@/types/messages";
import type {
    AiUserAccessRecord,
    FindUserFilters,
    UserRecord,
} from "@/types/records";
import { accessLabel } from "./user-ai-access";

// Filters debounce through useFilters (500 ms).
const { sendMessage } = useWebsocketService();
const userStore = useUserStore();
const loader = useLoader(true);
const users = usePagedData<UserRecord>(() => load());

const userToEdit = ref<EditableUser | null>(null);
const userToDelete = ref<UserRecord | null>(null);

const roleFilterItems: { label: string; value: Role | "" }[] = [
    { label: "All roles", value: "" },
    ...roleDropDownList,
];

const providersStore = useAiProvidersStore();
const canSeeAi = userStore.can(CanManageAiProviders.Update);
const aiAccess = ref<AiUserAccessRecord[]>([]);

const columns = computed<TableColumn<UserRecord>[]>(() => [
    { id: "name", name: "Name", key: "name" },
    { id: "username", name: "Username", key: "username" },
    { id: "role", name: "Role" },
    ...(canSeeAi ? [{ id: "ai", name: "AI" }] : []),
    { id: "actions", name: "", cellClass: "text-right whitespace-nowrap" },
]);

const loadAiAccess = async () => {
    if (!canSeeAi) {
        return;
    }
    try {
        await providersStore.load();
        aiAccess.value = await providersStore.getUserAccess(
            users.results.value.map((user) => user.id),
        );
    } catch (error) {
        useToastStore().reportError(error);
    }
};

const load = loader.wrap(async () => {
    const { records } = await sendMessage<FindUsersMessage, FindUsersResponse>(
        "users",
        "findUsers",
        {
            data: { filters: filters.value, page: users.page.value },
            expect: "findUsersResponse",
        },
    );
    users.setPagedData(records);
    void loadAiAccess();
});

const { filters, setFilter } = useFilters<Required<FindUserFilters>>({
    initialFilters: () => ({ name: "", username: "", role: "" }),
    onFilterLoad: () => users.loadFirstPage(),
});

const addUser = () => {
    userToEdit.value = {
        id: null,
        name: "",
        username: "",
        timezone: resolveTimeZone(),
        role: "user",
    };
};

const formDone = (reason: "ok" | "cancel") => {
    userToEdit.value = null;
    if (reason === "ok") {
        void load();
    }
};

const confirmDelete = async () => {
    try {
        await sendMessage<DeleteUserMessage, DeleteUserResponse>(
            "users",
            "deleteUser",
            {
                data: { id: userToDelete.value!.id },
                expect: "deleteUserResponse",
            },
        );
    } catch (error) {
        useToastStore().reportError(error);
    }
    userToDelete.value = null;
    await load();
};

useDataChanges(["user"], load, { skipOwnRequests: true });
onMounted(load);
</script>

<template>
    <div>
        <PageHeader title="Users" help="admin-users">
            Here you can manage user access to the NoteMe app. You can add
            users, change their roles, and delete them. Only admin role users
            can access this page and manage users.
            <template v-if="userStore.can(CanManageUsers.Update)" #actions>
                <Button color="success" @click="addUser">
                    <Icon name="user-plus" size="lg" /> Add
                </Button>
            </template>
        </PageHeader>

        <div class="flex flex-wrap gap-2 mb-4">
            <Input
                icon="search"
                class="grow min-w-48"
                :model-value="filters.name"
                placeholder="Search name"
                @update:model-value="(value) => setFilter('name', value)"
            />
            <Input
                icon="user"
                class="grow min-w-40"
                :model-value="filters.username"
                placeholder="Search username"
                @update:model-value="(value) => setFilter('username', value)"
            />
            <DropdownList
                class="w-44 max-md:grow"
                :model-value="filters.role"
                :items="roleFilterItems"
                @update:model-value="(value) => setFilter('role', value ?? '')"
            />
        </div>
        <Table
            :columns="columns"
            :rows="users.results.value"
            :is-loading="loader.running.value"
            :row-key="(row) => row.id"
            no-rows-text="No users found."
        >
            <template #cell-name="{ row }">
                <span class="inline-flex items-center gap-2.5">
                    <span
                        class="size-7 shrink-0 grid place-items-center rounded-full bg-accent-soft text-accent text-[11px] font-semibold"
                        >{{ initials(row.name) }}</span
                    >
                    {{ row.name }}
                </span>
            </template>
            <template #cell-username="{ row }">
                <span class="text-muted">{{ row.username }}</span>
            </template>
            <template #cell-role="{ row }">
                <Badge :tone="row.role === 'admin' ? 'accent' : 'neutral'">
                    {{ roleLabelMap[row.role] ?? row.role }}
                </Badge>
            </template>
            <template #cell-ai="{ row }">
                <span class="text-muted">{{
                    accessLabel(
                        aiAccess.find((record) => record.user_id === row.id),
                        providersStore.providers,
                    )
                }}</span>
            </template>
            <template #cell-actions="{ row }">
                <IconButton
                    icon="pencil"
                    title="Edit"
                    @click="userToEdit = { ...row }"
                />
                <IconButton
                    v-if="row.id !== userStore.user?.id"
                    icon="trash"
                    title="Delete"
                    danger
                    @click="userToDelete = row"
                />
            </template>
        </Table>

        <Pagination
            v-if="!loader.running.value"
            :total="users.total.value"
            :per-page="users.perPage.value"
            :current-page="users.page.value"
            @change="users.changePage"
        />

        <ConfirmDialog
            v-if="userToDelete"
            prompt="Are you sure you want to delete this user? This action cannot be undone."
            confirm-color="danger"
            confirm-text="Delete user"
            @confirm="confirmDelete"
            @cancel="userToDelete = null"
        />
        <EditUserForm v-if="userToEdit" :user="userToEdit" @done="formDone" />
    </div>
</template>
