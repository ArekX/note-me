<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Dialog from "@/components/Dialog.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import Input from "@/components/Input.vue";
import PageHeader from "@/components/PageHeader.vue";
import Loader from "@/components/Loader.vue";
import Pagination from "@/components/Pagination.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { usePagedData } from "@/composables/usePagedData";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { socketErrorMessage } from "@/lib/error-messages";
import {
    createPasskey,
    isPasskeyCancelled,
    passkeyErrorMessage,
} from "@/lib/passkeys";
import { useToastStore } from "@/stores/toast";
import type {
    DeleteOwnPasskeyMessage,
    DeleteOwnPasskeyResponse,
    GetOwnPasskeysMessage,
    GetOwnPasskeysResponse,
    GetPasskeyRegistrationMessage,
    GetPasskeyRegistrationResponse,
    UpdateOwnPasskeyMessage,
    UpdateOwnPasskeyResponse,
    VerifyPasskeyRegistrationMessage,
    VerifyPasskeyRegistrationResponse,
} from "@/types/messages";
import type { UserPasskeyRecord } from "@/types/records";

const { sendMessage } = useWebsocketService();
const toastStore = useToastStore();
const registering = useLoader();
const loading = useLoader(true);
const confirmingPassword = useLoader();
const deleting = useLoader();
const renaming = useLoader();
const {
    results,
    page,
    total,
    perPage,
    setPagedData,
    changePage,
    loadFirstPage,
} = usePagedData<UserPasskeyRecord>(() => loadPasskeys());

const isPasswordDialogVisible = ref(false);
const password = ref("");
const passwordError = ref("");
const passkeyToDelete = ref<UserPasskeyRecord | null>(null);
const passkeyToRename = ref<UserPasskeyRecord | null>(null);
const newName = ref("");
const renameError = ref("");

const columns: TableColumn<UserPasskeyRecord>[] = [
    { id: "name", name: "Name", key: "name" },
    { id: "created", name: "Created at" },
    { id: "last-used", name: "Last used" },
    { id: "actions", name: "Actions", headerClass: "w-1/6" },
];

const loadPasskeys = loading.wrap(async () => {
    const response = await sendMessage<
        GetOwnPasskeysMessage,
        GetOwnPasskeysResponse
    >("users", "getOwnPasskeys", {
        data: { page: page.value },
        expect: "getOwnPasskeysResponse",
    });
    setPagedData(response.records);
});

const requestOptions = (data: { password?: string }) =>
    sendMessage<GetPasskeyRegistrationMessage, GetPasskeyRegistrationResponse>(
        "users",
        "getPasskeyRegistrationOptions",
        { data, expect: "getPasskeyRegistrationOptionsResponse" },
    );

const completeRegistration = async (
    options: PublicKeyCredentialCreationOptionsJSON,
) => {
    let credential;
    try {
        credential = await createPasskey(options);
    } catch (error) {
        if (!isPasskeyCancelled(error)) {
            toastStore.addMessage({
                type: "error",
                text: `Registration failed due to: ${passkeyErrorMessage(error)}`,
            });
        }
        return;
    }

    try {
        const result = await sendMessage<
            VerifyPasskeyRegistrationMessage,
            VerifyPasskeyRegistrationResponse
        >("users", "verifyPasskeyRegistration", {
            data: { response: credential },
            expect: "verifyPasskeyRegistrationResponse",
        });
        if (!result.success) {
            toastStore.addMessage({
                type: "error",
                text: `Failed to register a passkey device. Reason: ${result.fail_reason}`,
            });
            return;
        }
    } catch (error) {
        toastStore.reportError(error, "Registration failed due to: ");
        return;
    }

    toastStore.addMessage({ type: "success", text: "Passkey registered." });
    await loadFirstPage();
};

const registerDevice = registering.wrap(async () => {
    try {
        const response = await requestOptions({});
        if (!response.options) {
            password.value = "";
            passwordError.value = "";
            isPasswordDialogVisible.value = true;
            return;
        }
        await completeRegistration(response.options);
    } catch (error) {
        toastStore.reportError(error, "Registration failed due to: ");
    }
});

const submitPassword = confirmingPassword.wrap(async () => {
    passwordError.value = "";
    let response: GetPasskeyRegistrationResponse;
    try {
        response = await requestOptions({ password: password.value });
    } catch (error) {
        passwordError.value = socketErrorMessage(error);
        return;
    }
    const options = response.options;
    if (!options) {
        return;
    }
    isPasswordDialogVisible.value = false;
    password.value = "";
    await registering.run(() => completeRegistration(options));
});

const deleteSelected = deleting.wrap(async () => {
    const passkey = passkeyToDelete.value;
    if (!passkey) {
        return;
    }
    try {
        await sendMessage<DeleteOwnPasskeyMessage, DeleteOwnPasskeyResponse>(
            "users",
            "deleteOwnPasskey",
            { data: { id: passkey.id }, expect: "deleteOwnPasskeyResponse" },
        );
    } catch (error) {
        toastStore.reportError(error, "Failed to delete passkey: ");
        return;
    } finally {
        passkeyToDelete.value = null;
    }
    await loadPasskeys();
    if (results.value.length === 0 && page.value > 1) {
        await loadFirstPage();
    }
});

const startRename = (passkey: UserPasskeyRecord) => {
    passkeyToRename.value = passkey;
    newName.value = passkey.name;
    renameError.value = "";
};

const renameSelected = renaming.wrap(async () => {
    const passkey = passkeyToRename.value;
    if (!passkey) {
        return;
    }
    try {
        const response = await sendMessage<
            UpdateOwnPasskeyMessage,
            UpdateOwnPasskeyResponse
        >("users", "updateOwnPasskey", {
            data: { id: passkey.id, name: newName.value },
            expect: "updateOwnPasskeyResponse",
        });
        const record = results.value.find((p) => p.id === response.id);
        if (record) {
            record.name = response.name;
        }
        passkeyToRename.value = null;
    } catch (error) {
        renameError.value = socketErrorMessage(error);
    }
});

useDataChanges(["passkey"], loadPasskeys, { skipOwnRequests: true });
onMounted(loadPasskeys);
</script>

<template>
    <div>
        <PageHeader title="My Passkeys">
            Passkeys allow you to use your device or security key to log in to
            your account without the need for a password. You can register a new
            device or security key here.
            <template #actions>
                <Loader v-if="registering.running.value">Waiting...</Loader>
                <Button v-else color="success" @click="registerDevice">
                    <Icon name="plus" size="lg" /> Register device
                </Button>
            </template>
        </PageHeader>

        <div>
            <Table
                :columns="columns"
                :rows="results"
                :is-loading="loading.running.value"
                :row-key="(row) => row.id"
                no-rows-text="No registered passkeys found."
            >
                <template #cell-created="{ row }">
                    <TimeAgo :time="row.created_at" />
                </template>
                <template #cell-last-used="{ row }">
                    <TimeAgo :time="row.last_used_at" />
                </template>
                <template #cell-actions="{ row }">
                    <IconButton
                        icon="pencil"
                        title="Rename"
                        add-class="mr-2 mb-2"
                        @click="startRename(row)"
                    />
                    <IconButton
                        icon="trash"
                        title="Delete"
                        danger
                        @click="passkeyToDelete = row"
                    />
                </template>
            </Table>

            <Pagination
                :current-page="page"
                :per-page="perPage"
                :total="total"
                @change="changePage"
            />
        </div>

        <ConfirmDialog
            v-if="passkeyToDelete"
            prompt="Are you sure you want to delete this passkey? You will no longer be able to use it to log in."
            confirm-text="Delete passkey"
            confirm-color="danger"
            :is-processing="deleting.running.value"
            @cancel="passkeyToDelete = null"
            @confirm="deleteSelected"
        />

        <Dialog
            v-if="isPasswordDialogVisible"
            can-cancel
            title="Confirm your password"
            icon="key"
            class="w-[28rem]"
            @cancel="isPasswordDialogVisible = false"
        >
            <form id="passkey-password-form" @submit.prevent="submitPassword">
                <p class="pb-4 text-muted">
                    Enter your password to register a new passkey.
                </p>
                <Input
                    v-model="password"
                    label="Password"
                    type="password"
                    name="passkey-password"
                />
                <div v-if="passwordError" class="text-danger">
                    {{ passwordError }}
                </div>
            </form>
            <template #footer>
                <Loader v-if="confirmingPassword.running.value">
                    Checking...
                </Loader>
                <template v-else>
                    <Button @click="isPasswordDialogVisible = false">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="passkey-password-form"
                        color="success"
                    >
                        Continue
                    </Button>
                </template>
            </template>
        </Dialog>

        <Dialog
            v-if="passkeyToRename"
            can-cancel
            title="Rename passkey"
            icon="pencil"
            class="w-[28rem]"
            @cancel="passkeyToRename = null"
        >
            <Loader v-if="renaming.running.value" color="white"
                >Saving...</Loader
            >
            <form
                v-else
                id="passkey-rename-form"
                @submit.prevent="renameSelected"
            >
                <Input v-model="newName" label="Passkey Name" />
                <div v-if="renameError" class="text-danger">
                    {{ renameError }}
                </div>
            </form>
            <template v-if="!renaming.running.value" #footer>
                <Button @click="passkeyToRename = null">Cancel</Button>
                <Button
                    type="submit"
                    form="passkey-rename-form"
                    color="success"
                >
                    Rename
                </Button>
            </template>
        </Dialog>
    </div>
</template>
