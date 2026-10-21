<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Button from "@/components/Button.vue";
import Callout from "@/components/Callout.vue";
import Dialog from "@/components/Dialog.vue";
import DropdownList from "@/components/DropdownList.vue";
import ErrorDisplay from "@/components/ErrorDisplay.vue";
import Input from "@/components/Input.vue";
import { useLoader } from "@/composables/useLoader";
import { useValidation } from "@/composables/useValidation";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { CanManageAiProviders, roleDropDownList, type Role } from "@/lib/rbac";
import { supportedTimezoneList } from "@/lib/time-zone";
import {
    addUserSchema,
    updateUserSchema,
    type AddUserRequest,
    type UpdateUserRequest,
} from "@/schemas/users";
import { useAiProvidersStore } from "@/stores/ai-providers";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type {
    CreateUserMessage,
    CreateUserResponse,
    UpdateUserMessage,
    UpdateUserResponse,
} from "@/types/messages";
import {
    accessItems,
    accessRecord,
    accessValue,
    type AiAccessValue,
} from "./user-ai-access";

export interface EditableUser {
    id: number | null;
    name: string;
    username: string;
    timezone: string;
    role: Role;
}

const props = defineProps<{ user: EditableUser }>();
const emit = defineEmits<{ done: [reason: "ok" | "cancel"] }>();

const { sendMessage } = useWebsocketService();
const userStore = useUserStore();
const toastStore = useToastStore();
const saving = useLoader();

const isNew = props.user.id === null;
const isSelf = !isNew && props.user.id === userStore.user?.id;
const validation = useValidation<AddUserRequest | UpdateUserRequest>(
    isNew ? addUserSchema : updateUserSchema,
);

const username = ref(props.user.username);
const name = ref(props.user.name);
const timezone = ref(props.user.timezone);
const role = ref<Role>(props.user.role);
const newPassword = ref("");

const providersStore = useAiProvidersStore();
const canSetAi = userStore.can(CanManageAiProviders.Update);
const aiAccess = ref<AiAccessValue>("default");
let storedAiAccess: AiAccessValue = "default";

onMounted(async () => {
    if (!canSetAi) {
        return;
    }
    try {
        await providersStore.load();
        if (props.user.id !== null) {
            const [record] = await providersStore.getUserAccess([
                props.user.id,
            ]);
            storedAiAccess = accessValue(record);
            aiAccess.value = storedAiAccess;
        }
    } catch (error) {
        toastStore.reportError(error);
    }
});

const saveAiAccess = async (userId: number) => {
    if (canSetAi && aiAccess.value !== storedAiAccess) {
        await providersStore.setUserAccess(
            accessRecord(userId, aiAccess.value),
        );
    }
};

// The original sent "" after the field was cleared, which failed the
// 8 character rule and blocked saving without a new password.
const passwordPath = computed(() => (isNew ? "password" : "new_password"));

const addData = (): AddUserRequest => ({
    name: name.value,
    username: username.value,
    password: newPassword.value,
    role: role.value,
    timezone: timezone.value,
});

const updateData = (): UpdateUserRequest => ({
    name: name.value,
    role: role.value,
    timezone: timezone.value,
    ...(newPassword.value ? { new_password: newPassword.value } : {}),
});

const save = async () => {
    if (isNew) {
        const created = await sendMessage<
            CreateUserMessage,
            CreateUserResponse
        >("users", "createUser", {
            data: { data: addData() },
            expect: "createUserResponse",
        });
        await saveAiAccess(created.data.id);
        toastStore.addMessage({
            type: "success",
            text: "User created successfully.",
        });
        return;
    }

    if (isSelf) {
        await userStore.updateProfile({
            name: name.value,
            timezone: timezone.value,
        });
        await saveAiAccess(props.user.id!);
        return;
    }

    await sendMessage<UpdateUserMessage, UpdateUserResponse>(
        "users",
        "updateUser",
        {
            data: { id: props.user.id!, data: updateData() },
            expect: "updateUserResponse",
        },
    );
    await saveAiAccess(props.user.id!);
};

const submit = saving.wrap(async () => {
    if (!(await validation.validate(isNew ? addData() : updateData()))) {
        return;
    }

    try {
        await save();
    } catch (error) {
        if (validation.setServerErrors(error)) {
            return;
        }
        toastStore.reportError(error, "Failed to save user. Reason: ");
        return;
    }

    emit("done", "ok");
});
</script>

<template>
    <Dialog
        :title="isNew ? 'Add user' : `Edit ${user.username}`"
        :icon="isNew ? 'user-plus' : 'user'"
        class="w-[34rem]"
        can-cancel
        @cancel="emit('done', 'cancel')"
    >
        <form id="edit-user-form" @submit.prevent="submit">
            <div class="mb-4">
                <template v-if="isNew">
                    <Input
                        v-model="username"
                        label="Username"
                        type="text"
                        :tab-index="1"
                        :validation="validation.state"
                        path="username"
                    />
                </template>
            </div>
            <div class="mb-4">
                <Input
                    v-model="name"
                    label="Name"
                    type="text"
                    :tab-index="2"
                    :validation="validation.state"
                    path="name"
                />
            </div>
            <div class="mb-4">
                <DropdownList
                    v-model="timezone"
                    label="Timezone"
                    :tab-index="3"
                    :items="supportedTimezoneList"
                    :validation="validation.state"
                    path="timezone"
                />
            </div>
            <div class="mb-4">
                <DropdownList
                    v-model="role"
                    label="Role"
                    :tab-index="4"
                    :disabled="isSelf"
                    :items="roleDropDownList"
                />
                <span v-if="isSelf" class="text-sm">
                    You cannot change your own role.
                </span>
                <ErrorDisplay :state="validation.state" path="role" />
            </div>
            <div v-if="canSetAi" class="mb-4">
                <DropdownList
                    v-model="aiAccess"
                    label="AI access"
                    :tab-index="5"
                    :items="accessItems(providersStore.providers)"
                />
            </div>
            <div v-if="isSelf" class="py-2">
                Please change your password via profile page.
            </div>
            <div v-else class="mb-4">
                <Input
                    v-model="newPassword"
                    label="Set new password"
                    type="password"
                    :tab-index="5"
                    :validation="validation.state"
                    :path="passwordPath"
                />
                <Callout v-if="!isNew" icon="error" class="mt-3">
                    <strong>Important:</strong> If the user has any password
                    protected notes, they will no longer be accessible if you
                    change the password.
                </Callout>
            </div>
        </form>
        <template #footer>
            <Button @click="emit('done', 'cancel')">Cancel</Button>
            <Button
                type="submit"
                form="edit-user-form"
                color="success"
                :disabled="saving.running.value"
            >
                {{ isNew ? "Add user" : "Save" }}
            </Button>
        </template>
    </Dialog>
</template>
