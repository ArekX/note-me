import type { McpClientRecord } from "@/types/records";

export const mockMcpClients = (t: number): McpClientRecord[] => [
    {
        id: 1,
        name: "Claude Code",
        kind: "token",
        client_id: null,
        token_prefix: "nmcp_Xk3q",
        redirect_uris: [],
        is_read_only: false,
        created_at: t - 30 * 24 * 3600,
        last_used_at: t - 3600,
    },
    {
        id: 2,
        name: "claude.ai",
        kind: "oauth",
        client_id: "mock-client-id",
        token_prefix: null,
        redirect_uris: [
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.com/api/mcp/auth_callback",
        ],
        is_read_only: true,
        created_at: t - 7 * 24 * 3600,
        last_used_at: null,
    },
];
