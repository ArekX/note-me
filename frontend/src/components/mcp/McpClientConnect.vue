<script setup lang="ts">
import { computed } from "vue";
import Button from "@/components/Button.vue";
import Callout from "@/components/Callout.vue";
import Dialog from "@/components/Dialog.vue";
import type { McpClientRecord } from "@/types/records";
import CopyValue from "./CopyValue.vue";

const props = defineProps<{ client: McpClientRecord; secret: string }>();
const emit = defineEmits<{ close: [] }>();

const endpoint = `${window.location.origin}/mcp`;
const isToken = computed(() => props.client.kind === "token");

const claudeCodeCommand = computed(
    () =>
        `claude mcp add --transport http noteme ${endpoint} --header "Authorization: Bearer ${props.secret}"`,
);

const jsonSettings = computed(() =>
    JSON.stringify(
        {
            mcpServers: {
                noteme: {
                    url: endpoint,
                    headers: { Authorization: `Bearer ${props.secret}` },
                },
            },
        },
        null,
        2,
    ),
);
</script>

<template>
    <Dialog
        can-cancel
        class="w-[40rem] max-md:w-full"
        :title="`Connect ${client.name}`"
        icon="plug"
        @cancel="emit('close')"
    >
        <div class="flex flex-col gap-3">
            <Callout tone="warning" icon="error">
                Copy the {{ isToken ? "token" : "client secret" }} now. It
                cannot be shown again; if you lose it, generate a new one.
            </Callout>

            <CopyValue label="MCP server URL" :value="endpoint" />
            <CopyValue v-if="isToken" label="Token" :value="secret" />
            <template v-else>
                <CopyValue label="Client ID" :value="client.client_id ?? ''" />
                <CopyValue label="Client secret" :value="secret" />
            </template>

            <h2 class="text-base font-semibold pt-2">Example settings</h2>
            <template v-if="isToken">
                <CopyValue
                    label="Claude Code"
                    :value="claudeCodeCommand"
                    multiline
                />
                <CopyValue
                    label="Cursor, VS Code and other tools"
                    :value="jsonSettings"
                    multiline
                />
                <p class="text-xs text-muted">
                    Tools differ a little in where their settings live and what
                    the list of servers is called; their documentation for
                    remote (HTTP) MCP servers has the details.
                </p>
            </template>
            <template v-else>
                <div>
                    <h3 class="font-semibold">Claude Desktop and claude.ai</h3>
                    <ol class="list-decimal pl-5 text-sm text-muted">
                        <li>
                            Open Settings → Connectors → Add custom connector.
                        </li>
                        <li>Enter a name and the MCP server URL.</li>
                        <li>
                            Open Advanced settings and enter the client ID as
                            OAuth Client ID and the client secret as OAuth
                            Client Secret.
                        </li>
                        <li>
                            Add the connector, connect it and allow access on
                            the NoteMe page that opens.
                        </li>
                    </ol>
                </div>
                <div>
                    <h3 class="font-semibold">ChatGPT</h3>
                    <ol class="list-decimal pl-5 text-sm text-muted">
                        <li>
                            Open Settings → Apps &amp; Connectors and create a
                            connector.
                        </li>
                        <li>
                            Enter the MCP server URL, choose OAuth and enter the
                            client ID and the client secret.
                        </li>
                        <li>
                            Connect it and allow access on the NoteMe page that
                            opens.
                        </li>
                    </ol>
                </div>
            </template>

            <p class="text-sm text-muted">
                The AI acts as you, with your permissions{{
                    client.is_read_only ? ", and can only read" : ""
                }}. Protected notes are never available over MCP.
            </p>
        </div>
        <template #footer>
            <Button color="success" @click="emit('close')">Done</Button>
        </template>
    </Dialog>
</template>
