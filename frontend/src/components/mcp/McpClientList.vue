<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import Icon from "@/components/Icon.vue";
import IconButton from "@/components/IconButton.vue";
import PageHeader from "@/components/PageHeader.vue";
import Table, { type TableColumn } from "@/components/Table.vue";
import TimeAgo from "@/components/TimeAgo.vue";
import { useDataChanges } from "@/composables/useDataChanges";
import { useLoader } from "@/composables/useLoader";
import { useWebsocketService } from "@/composables/useWebsocketService";
import { useToastStore } from "@/stores/toast";
import type {
    DeleteMcpClientMessage,
    DeleteMcpClientResponse,
    GetMcpClientsMessage,
    GetMcpClientsResponse,
    RegenerateMcpClientSecretMessage,
    RegenerateMcpClientSecretResponse,
} from "@/types/messages";
import type { McpClientRecord } from "@/types/records";
import McpClientConnect from "./McpClientConnect.vue";
import McpClientForm from "./McpClientForm.vue";

const { sendMessage } = useWebsocketService();
const toastStore = useToastStore();
const loading = useLoader(true);
const deleting = useLoader();
const regenerating = useLoader();

const clients = ref<McpClientRecord[]>([]);
// undefined: closed, null: adding a new client.
const clientToEdit = ref<McpClientRecord | null | undefined>(undefined);
const clientToDelete = ref<McpClientRecord | null>(null);
const clientToRegenerate = ref<McpClientRecord | null>(null);
// Kept only while the dialog is open; the server never sends it again.
const shownSecret = ref<{ client: McpClientRecord; secret: string } | null>(
    null,
);

const kindLabels = { token: "Token", oauth: "OAuth" };

const columns: TableColumn<McpClientRecord>[] = [
    { id: "name", name: "Name" },
    { id: "kind", name: "Kind" },
    { id: "created", name: "Created" },
    { id: "last-used", name: "Last used" },
    { id: "actions", name: "", cellClass: "text-right whitespace-nowrap" },
];

const load = loading.wrap(async () => {
    try {
        const response = await sendMessage<
            GetMcpClientsMessage,
            GetMcpClientsResponse
        >("users", "getMcpClients", { expect: "getMcpClientsResponse" });
        clients.value = response.clients;
    } catch (error) {
        toastStore.reportError(error);
    }
});

const onCreated = async (client: McpClientRecord, secret: string) => {
    clientToEdit.value = undefined;
    shownSecret.value = { client, secret };
    await load();
};

const onSaved = async () => {
    clientToEdit.value = undefined;
    await load();
};

const regeneratePrompt = computed(() => {
    const client = clientToRegenerate.value;
    if (!client) {
        return "";
    }
    return client.kind === "token"
        ? `Generate a new token for ${client.name}? The old token is deleted and stops working at once; every tool that uses it needs the new one.`
        : `Generate a new client secret for ${client.name}? The old secret stops working. Apps already connected keep their access and need the new secret only when they connect again.`;
});

const regenerate = regenerating.wrap(async () => {
    const client = clientToRegenerate.value;
    if (!client) {
        return;
    }
    try {
        const response = await sendMessage<
            RegenerateMcpClientSecretMessage,
            RegenerateMcpClientSecretResponse
        >("users", "regenerateMcpClientSecret", {
            data: { id: client.id },
            expect: "regenerateMcpClientSecretResponse",
        });
        shownSecret.value = {
            client: response.client,
            secret: response.secret,
        };
    } catch (error) {
        toastStore.reportError(error);
        return;
    } finally {
        clientToRegenerate.value = null;
    }
    await load();
});

const deleteSelected = deleting.wrap(async () => {
    const client = clientToDelete.value;
    if (!client) {
        return;
    }
    try {
        await sendMessage<DeleteMcpClientMessage, DeleteMcpClientResponse>(
            "users",
            "deleteMcpClient",
            { data: { id: client.id }, expect: "deleteMcpClientResponse" },
        );
    } catch (error) {
        toastStore.reportError(error);
        return;
    } finally {
        clientToDelete.value = null;
    }
    await load();
});

useDataChanges(["mcpClient"], load, { skipOwnRequests: true });
onMounted(load);
</script>

<template>
    <div>
        <PageHeader title="MCP clients" help="mcp-clients">
            Connect the AI of your choice (Claude Code, Claude Desktop,
            claude.ai, ChatGPT, Cursor, ...) to NoteMe. It works with your notes
            as you, with your permissions. Protected notes are never available
            to it.
            <template #actions>
                <Button color="success" @click="clientToEdit = null">
                    <Icon name="plus" size="lg" /> Add client
                </Button>
            </template>
        </PageHeader>

        <Table
            :columns="columns"
            :rows="clients"
            :is-loading="loading.running.value"
            :row-key="(row) => row.id"
            no-rows-text="No MCP clients yet."
        >
            <template #cell-name="{ row }">
                <span class="inline-flex flex-wrap items-center gap-2">
                    {{ row.name }}
                    <Badge v-if="row.is_read_only" tone="accent">
                        Read only
                    </Badge>
                </span>
            </template>
            <template #cell-kind="{ row }">
                {{ kindLabels[row.kind] }}
                <code
                    v-if="row.token_prefix ?? row.client_id"
                    class="block text-xs text-muted"
                    >{{
                        row.token_prefix
                            ? `${row.token_prefix}…`
                            : row.client_id
                    }}</code
                >
            </template>
            <template #cell-created="{ row }">
                <TimeAgo :time="row.created_at" />
            </template>
            <template #cell-last-used="{ row }">
                <TimeAgo :time="row.last_used_at" empty-text="Never" />
            </template>
            <template #cell-actions="{ row }">
                <IconButton
                    icon="pencil"
                    title="Edit"
                    @click="clientToEdit = row"
                />
                <IconButton
                    icon="refresh"
                    :title="
                        row.kind === 'token'
                            ? 'Generate a new token'
                            : 'Generate a new client secret'
                    "
                    @click="clientToRegenerate = row"
                />
                <IconButton
                    icon="trash"
                    title="Delete"
                    danger
                    @click="clientToDelete = row"
                />
            </template>
        </Table>

        <McpClientForm
            v-if="clientToEdit !== undefined"
            :client="clientToEdit"
            @close="clientToEdit = undefined"
            @saved="onSaved"
            @created="onCreated"
        />
        <McpClientConnect
            v-if="shownSecret"
            :client="shownSecret.client"
            :secret="shownSecret.secret"
            @close="shownSecret = null"
        />
        <ConfirmDialog
            v-if="clientToRegenerate"
            :prompt="regeneratePrompt"
            confirm-text="Generate"
            confirm-color="warning"
            :is-processing="regenerating.running.value"
            @cancel="clientToRegenerate = null"
            @confirm="regenerate"
        />
        <ConfirmDialog
            v-if="clientToDelete"
            :prompt="`Delete ${clientToDelete.name}? The AI connected with it loses access at once.`"
            confirm-text="Delete client"
            confirm-color="danger"
            :is-processing="deleting.running.value"
            @cancel="clientToDelete = null"
            @confirm="deleteSelected"
        />
    </div>
</template>
