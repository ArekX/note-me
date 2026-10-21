import { validateSchema } from "@/schemas";
import { mcpClientSchema, type McpClientRequest } from "@/schemas/mcp";
import type {
    CreateMcpClientResponse,
    DeleteMcpClientResponse,
    GetMcpClientsResponse,
    McpClientFrontendMessage,
    RegenerateMcpClientSecretResponse,
    UpdateMcpClientResponse,
} from "@/types/messages";
import type { McpClientKind, McpClientRecord } from "@/types/records";
import { nextId, type MockHandlerMap } from "../handler";
import { now, type MockState } from "../state";

let secretCounter = 0;

const newSecret = (kind: McpClientKind) =>
    `${kind === "token" ? "nmcp_" : "nmcps_"}mock-secret-${++secretCounter}`;

// Same checks and messages as the server.
const invalid = async (
    state: MockState,
    kind: McpClientKind,
    data: McpClientRequest,
    id: number | null,
): Promise<string | null> => {
    const issues = await validateSchema(mcpClientSchema, { ...data, kind });
    if (issues) {
        return JSON.stringify(
            issues.map(({ code, path, message }) => ({ code, path, message })),
        );
    }
    const name = data.name.trim();
    return state.mcpClients.some((c) => c.name === name && c.id !== id)
        ? "MCP client with this name already exists."
        : null;
};

export const mcpClientHandlers: MockHandlerMap<McpClientFrontendMessage> = {
    getMcpClients: (_message, { state, respond }) =>
        respond<GetMcpClientsResponse>("getMcpClientsResponse", {
            clients: state.mcpClients.map((c) => ({ ...c })),
        }),
    createMcpClient: async ({ data }, { state, respond, fail }) => {
        const error = await invalid(state, data.kind, data, null);
        if (error) {
            return fail(error);
        }
        const secret = newSecret(data.kind);
        const id = nextId(state);
        const client: McpClientRecord = {
            id,
            name: data.name.trim(),
            kind: data.kind,
            client_id: data.kind === "oauth" ? `mock-client-${id}` : null,
            token_prefix: data.kind === "token" ? secret.slice(0, 9) : null,
            redirect_uris: data.kind === "oauth" ? data.redirect_uris : [],
            is_read_only: data.is_read_only,
            created_at: now(),
            last_used_at: null,
        };
        state.mcpClients.push(client);
        respond<CreateMcpClientResponse>("createMcpClientResponse", {
            client: { ...client },
            secret,
        });
    },
    updateMcpClient: async ({ id, data }, { state, respond, fail }) => {
        const client = state.mcpClients.find((c) => c.id === id);
        if (!client) {
            return fail("MCP client not found.");
        }
        const error = await invalid(state, client.kind, data, id);
        if (error) {
            return fail(error);
        }
        client.name = data.name.trim();
        client.is_read_only = data.is_read_only;
        client.redirect_uris =
            client.kind === "oauth" ? data.redirect_uris : [];
        respond<UpdateMcpClientResponse>("updateMcpClientResponse", {
            client: { ...client },
        });
    },
    deleteMcpClient: ({ id }, { state, respond, fail }) => {
        if (!state.mcpClients.some((c) => c.id === id)) {
            return fail("MCP client not found.");
        }
        state.mcpClients = state.mcpClients.filter((c) => c.id !== id);
        respond<DeleteMcpClientResponse>("deleteMcpClientResponse", { id });
    },
    regenerateMcpClientSecret: ({ id }, { state, respond, fail }) => {
        const client = state.mcpClients.find((c) => c.id === id);
        if (!client) {
            return fail("MCP client not found.");
        }
        const secret = newSecret(client.kind);
        if (client.kind === "token") {
            client.token_prefix = secret.slice(0, 9);
        }
        respond<RegenerateMcpClientSecretResponse>(
            "regenerateMcpClientSecretResponse",
            { client: { ...client }, secret },
        );
    },
};
