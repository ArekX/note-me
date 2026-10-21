<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "./Button.vue";
import Icon from "./Icon.vue";
import IconButton from "@/components/IconButton.vue";
import Input from "./Input.vue";
import Pagination from "./Pagination.vue";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useUserStore } from "@/stores/user";
import type {
    FindPickUsersMessage,
    FindPickUsersResponse,
} from "@/types/messages";
import type { PickUserRecord } from "@/types/records";

const props = withDefaults(
    defineProps<{
        selected: PickUserRecord[];
        excludeCurrentUser?: boolean;
        selectedUsersText?: string;
        noSelectedUsersText?: string;
    }>(),
    {
        excludeCurrentUser: true,
        selectedUsersText: "Selected users",
        noSelectedUsersText: "No users selected",
    },
);

const emit = defineEmits<{
    selectUser: [user: PickUserRecord];
    unselectUser: [user: PickUserRecord];
}>();

const { sendMessage } = useWebsocketService();
const userStore = useUserStore();
const loader = useLoader();
const users = usePagedData<PickUserRecord>(() => search(), 5);
const searchText = ref("");

const search = loader.wrap(async () => {
    if (searchText.value === "") {
        users.setPagedData({ results: [], total: 0 });
        return;
    }

    const excludeUserIds = props.selected.map((user) => user.id);
    if (props.excludeCurrentUser && userStore.user) {
        excludeUserIds.push(userStore.user.id);
    }

    const { records } = await sendMessage<
        FindPickUsersMessage,
        FindPickUsersResponse
    >("users", "findPickUsers", {
        data: {
            filters: {
                name: searchText.value,
                exclude_user_ids: excludeUserIds,
            },
            page: users.page.value,
        },
        expect: "findPickUsersResponse",
    });
    users.setPagedData(records);
});

const addableUsers = computed(() =>
    users.results.value.filter(
        (user) => !props.selected.some((selected) => selected.id === user.id),
    ),
);

const changeSearch = () => void users.loadFirstPage();

watch(() => props.selected, changeSearch);
</script>

<template>
    <div>
        <div class="w-full">
            <Input
                v-model="searchText"
                label="Search for user"
                placeholder="Name or Username"
                @update:model-value="changeSearch"
            />
        </div>

        <div
            v-if="loader.running.value"
            role="status"
            aria-busy="true"
            aria-label="Searching for users"
            class="mt-2"
        >
            <span class="skeleton h-3.5 w-24 mb-2" />
            <div class="grid grid-cols-2 gap-2">
                <span
                    v-for="index in 4"
                    :key="index"
                    class="skeleton h-11 rounded-lg mb-2"
                />
            </div>
        </div>
        <div v-else-if="searchText.length > 0" class="mt-2">
            <div class="text-sm mb-2">Found Users</div>
            <div class="grid grid-cols-2 gap-2">
                <div
                    v-for="user in addableUsers"
                    :key="user.id"
                    class="flex justify-between rounded-lg border-line border p-2 bg-surface-2 mb-2 items-center"
                >
                    <div>{{ user.name }} ({{ user.username }})</div>
                    <Button
                        color="success"
                        size="sm"
                        :title="`Add ${user.name} to selected users`"
                        @click="emit('selectUser', user)"
                    >
                        <Icon name="plus" />
                    </Button>
                </div>
                <div
                    v-if="
                        users.results.value.length > 0 &&
                        addableUsers.length === 0
                    "
                    class="text-muted"
                >
                    No more users to add.
                </div>
                <div v-if="users.total.value === 0" class="text-muted">
                    No users found
                </div>
                <Pagination
                    :current-page="users.page.value"
                    :per-page="users.perPage.value"
                    :total="users.total.value"
                    @change="users.changePage"
                />
            </div>
        </div>

        <div class="mt-2">
            <div class="text-sm">{{ selectedUsersText }}</div>
            <div class="grid md:grid-cols-2 md:gap-2 max-md:grid-cols-1">
                <div
                    v-for="user in selected"
                    :key="user.id"
                    class="flex justify-between rounded-lg border-line border p-2 bg-surface-2 mb-2 items-center"
                >
                    <div>{{ user.name }} ({{ user.username }})</div>
                    <IconButton
                        icon="x"
                        add-class="ml-2"
                        :title="`Remove ${user.name} from selected users`"
                        danger
                        @click="emit('unselectUser', user)"
                    />
                </div>
                <div v-if="selected.length === 0" class="text-muted">
                    {{ noSelectedUsersText }}
                </div>
            </div>
        </div>
    </div>
</template>
