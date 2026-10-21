<script setup lang="ts">
import { ref } from "vue";
import UserPicker from "@/components/UserPicker.vue";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useToastStore } from "@/stores/toast";
import type {
    ShareToUsersMessage,
    ShareToUsersResponse,
} from "@/types/messages";
import type { PickUserRecord } from "@/types/records";

// Every change is saved
// at once.
const props = defineProps<{ noteId: number; initialUsers: PickUserRecord[] }>();
const emit = defineEmits<{ usersChanged: [users: PickUserRecord[]] }>();

const { sendMessage } = useWebsocketService();
const users = ref<PickUserRecord[]>([...props.initialUsers]);

const save = async (newUsers: PickUserRecord[]) => {
    const previous = users.value;
    users.value = newUsers;
    try {
        await sendMessage<ShareToUsersMessage, ShareToUsersResponse>(
            "notes",
            "shareToUsers",
            {
                data: {
                    note_id: props.noteId,
                    user_ids: newUsers.map((user) => user.id),
                },
                expect: "shareToUsersResponse",
            },
        );
    } catch (error) {
        users.value = previous;
        useToastStore().reportError(error);
        return;
    }
    emit("usersChanged", newUsers);
};
</script>

<template>
    <UserPicker
        :selected="users"
        selected-users-text="Note is shared to:"
        no-selected-users-text="No users."
        @select-user="(user) => save([...users, user])"
        @unselect-user="(user) => save(users.filter((u) => u.id !== user.id))"
    />
</template>
