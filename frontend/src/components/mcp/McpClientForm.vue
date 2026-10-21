<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import ButtonGroup from "@/components/ButtonGroup.vue";
import Checkbox from "@/components/Checkbox.vue";
import Dialog from "@/components/Dialog.vue";
import FormField from "@/components/FormField.vue";
import Input from "@/components/Input.vue";
import Loader from "@/components/Loader.vue";
import { useLoader } from "@/composables/useLoader";
import { useValidation } from "@/composables/useValidation";
import { useWebsocketService } from "@/composables/useWebsocketService";
import {
    mcpClientSchema,
    type McpClientRequest,
    type NewMcpClientRequest,
} from "@/schemas/mcp";
import { useToastStore } from "@/stores/toast";
import type {
    CreateMcpClientMessage,
    CreateMcpClientResponse,
    UpdateMcpClientMessage,
    UpdateMcpClientResponse,
} from "@/types/messages";
import type { McpClientKind, McpClientRecord } from "@/types/records";
import RedirectUriList from "./RedirectUriList.vue";

const props = defineProps<{ client: McpClientRecord | null }>();
const emit = defineEmits<{
    close: [];
    saved: [];
    created: [client: McpClientRecord, secret: string];
}>();

const { sendMessage } = useWebsocketService();
const toastStore = useToastStore();
const saving = useLoader();

const kind = ref<McpClientKind>(props.client?.kind ?? "token");
const name = ref(props.client?.name ?? "");
const isReadOnly = ref(props.client?.is_read_only ?? false);
const redirectUris = ref<string[]>([...(props.client?.redirect_uris ?? [])]);
const newUri = ref("");
const validation = useValidation<NewMcpClientRequest>(mcpClientSchema);

const kinds: { id: McpClientKind; name: string; description: string }[] = [
    {
        id: "token",
        name: "Token",
        description:
            "For Claude Code, Cursor, VS Code and other tools that take a token.",
    },
    {
        id: "oauth",
        name: "OAuth",
        description: "For Claude Desktop, claude.ai and ChatGPT connectors.",
    },
];

// A typed URI counts even when Add was not pressed.
const data = (): McpClientRequest => ({
    name: name.value.trim(),
    is_read_only: isReadOnly.value,
    redirect_uris:
        kind.value === "oauth"
            ? [
                  ...new Set(
                      [...redirectUris.value, newUri.value.trim()].filter(
                          (uri) => uri !== "",
                      ),
                  ),
              ]
            : [],
});

const send = async (request: McpClientRequest) => {
    if (props.client) {
        await sendMessage<UpdateMcpClientMessage, UpdateMcpClientResponse>(
            "users",
            "updateMcpClient",
            {
                data: { id: props.client.id, data: request },
                expect: "updateMcpClientResponse",
            },
        );
        emit("saved");
        return;
    }
    const response = await sendMessage<
        CreateMcpClientMessage,
        CreateMcpClientResponse
    >("users", "createMcpClient", {
        data: { data: { ...request, kind: kind.value } },
        expect: "createMcpClientResponse",
    });
    emit("created", response.client, response.secret ?? "");
};

const save = saving.wrap(async () => {
    const request = data();
    if (!(await validation.validate({ ...request, kind: kind.value }))) {
        return;
    }
    try {
        await send(request);
    } catch (error) {
        if (validation.setServerErrors(error)) {
            return;
        }
        toastStore.reportError(error);
    }
});
</script>

<template>
    <Dialog
        can-cancel
        class="w-[36rem] max-md:w-full"
        :title="client ? 'Edit MCP client' : 'Add MCP client'"
        icon="plug"
        @cancel="emit('close')"
    >
        <form id="mcp-client-form" @submit.prevent="save">
            <div class="py-2">
                <Input
                    v-model="name"
                    label="Name"
                    name="mcp-client-name"
                    placeholder="For example: Claude Code on my laptop"
                    :validation="validation.state"
                    path="name"
                />
            </div>
            <div v-if="!client" class="py-2">
                <FormField label="Connect with">
                    <ButtonGroup
                        :items="kinds"
                        :active-item="kind"
                        @select="kind = $event"
                    />
                    <p class="text-xs text-muted pt-1">
                        {{ kinds.find((k) => k.id === kind)?.description }}
                    </p>
                </FormField>
            </div>
            <div class="py-2">
                <Checkbox v-model="isReadOnly" label="Read only" />
                <p class="text-xs text-muted">
                    The AI only gets the tools that read, such as searching and
                    reading notes, and cannot change anything.
                </p>
            </div>
            <div v-if="kind === 'oauth'" class="py-2">
                <RedirectUriList
                    v-model="redirectUris"
                    v-model:new-uri="newUri"
                    :validation="validation.state"
                />
            </div>
            <Loader v-if="saving.running.value" color="white">Saving...</Loader>
        </form>
        <template #footer>
            <Button @click="emit('close')">Cancel</Button>
            <Button type="submit" form="mcp-client-form" color="success">
                {{ client ? "Save" : "Add" }}
            </Button>
        </template>
    </Dialog>
</template>
