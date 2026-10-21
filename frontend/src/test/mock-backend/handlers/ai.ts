import type {
    AiFrontendMessage,
    CancelAiTurnResponse,
    CreateAiProviderResponse,
    DeleteAiConversationResponse,
    DeleteAiProviderResponse,
    FindAiConversationsResponse,
    GetAiAccessResponse,
    GetAiConversationResponse,
    GetAiProvidersResponse,
    GetAiToolsResponse,
    GetAiUserAccessResponse,
    ListAiProviderModelsResponse,
    RenameAiConversationResponse,
    SendAiMessageResponse,
    SetAiUserAccessResponse,
    SetDefaultAiProviderResponse,
    SubmitAiToolResultsResponse,
    TestAiProviderResponse,
    UpdateAiProviderResponse,
} from "@/types/messages";
import type { AiProviderRecord } from "@/types/records";
import { CanManageAiProviders } from "@/lib/rbac";
import {
    missingPermission,
    nextId,
    paged,
    type MockHandlerMap,
} from "../handler";
import { now, type MockState } from "../state";

const providerRecord = (
    state: MockState,
    data: {
        name: string;
        type: AiProviderRecord["type"];
        base_url: string;
        model: string;
        api_key?: string;
    },
    existing?: AiProviderRecord,
): AiProviderRecord => ({
    id: existing?.id ?? nextId(state),
    name: data.name,
    type: data.type,
    base_url: data.base_url,
    model: data.model,
    is_default: existing?.is_default ?? false,
    has_key: Boolean(data.api_key) || (existing?.has_key ?? false),
    key_unreadable: false,
    created_at: existing?.created_at ?? now(),
    updated_at: now(),
});

export const aiHandlers: MockHandlerMap<AiFrontendMessage> = {
    getAccess: (_, { state, respond }) =>
        respond<GetAiAccessResponse>("getAccessResponse", state.ai.access),
    getTools: (_, { state, respond }) =>
        respond<GetAiToolsResponse>("getToolsResponse", {
            tools: state.ai.tools,
        }),
    findConversations: ({ page }, { state, respond }) =>
        respond<FindAiConversationsResponse>("findConversationsResponse", {
            records: paged(state.ai.conversations, page),
        }),
    getConversation: ({ id }, { state, respond, fail }) => {
        const conversation = state.ai.conversations.find((c) => c.id === id);
        if (!conversation) {
            return fail("Conversation not found.");
        }
        respond<GetAiConversationResponse>("getConversationResponse", {
            conversation,
            messages: state.ai.messages.get(id) ?? [],
            is_locked: state.ai.lockedConversations.has(id),
            is_running: false,
        });
    },
    sendMessage: ({ conversation_id, text }, { state, respond }) => {
        let conversation = state.ai.conversations.find(
            (c) => c.id === conversation_id,
        );
        if (!conversation) {
            conversation = {
                id: nextId(state),
                title: text.split("\n")[0]!,
                created_at: now(),
                updated_at: now(),
            };
            state.ai.conversations.unshift(conversation);
        }
        respond<SendAiMessageResponse>("sendMessageResponse", {
            conversation,
            turn_id: `turn-${conversation.id}`,
        });
    },
    submitToolResults: ({ results }, { state, respond }) => {
        state.ai.submitted.push(results);
        respond<SubmitAiToolResultsResponse>("submitToolResultsResponse");
    },
    cancelTurn: (_, { respond }) =>
        respond<CancelAiTurnResponse>("cancelTurnResponse", {
            cancelled: true,
        }),
    renameConversation: ({ id, title }, { state, respond }) => {
        const conversation = state.ai.conversations.find((c) => c.id === id);
        if (conversation) {
            conversation.title = title;
        }
        respond<RenameAiConversationResponse>("renameConversationResponse", {
            id,
            title,
        });
    },
    deleteConversation: ({ id }, { state, respond }) => {
        state.ai.conversations = state.ai.conversations.filter(
            (c) => c.id !== id,
        );
        respond<DeleteAiConversationResponse>("deleteConversationResponse", {
            deleted_id: id,
        });
    },
    getProviders: (_, { state, respond, fail }) => {
        const denied = missingPermission(state, CanManageAiProviders.Update);
        if (denied) {
            return fail(denied);
        }
        respond<GetAiProvidersResponse>("getProvidersResponse", {
            providers: state.ai.providers,
        });
    },
    createProvider: ({ data }, { state, respond }) => {
        const record = providerRecord(state, data);
        state.ai.providers.push(record);
        respond<CreateAiProviderResponse>("createProviderResponse", { record });
    },
    updateProvider: ({ id, data }, { state, respond, fail }) => {
        const index = state.ai.providers.findIndex((p) => p.id === id);
        if (index < 0) {
            return fail("Provider not found.");
        }
        const record = providerRecord(state, data, state.ai.providers[index]);
        state.ai.providers[index] = record;
        respond<UpdateAiProviderResponse>("updateProviderResponse", { record });
    },
    deleteProvider: ({ id }, { state, respond }) => {
        state.ai.providers = state.ai.providers.filter((p) => p.id !== id);
        respond<DeleteAiProviderResponse>("deleteProviderResponse", {
            deleted_id: id,
        });
    },
    setDefaultProvider: ({ id }, { state, respond }) => {
        state.ai.providers.forEach((p) => (p.is_default = p.id === id));
        respond<SetDefaultAiProviderResponse>("setDefaultProviderResponse", {
            id,
        });
    },
    testProvider: ({ id }, { state, respond }) => {
        const provider = state.ai.providers.find((p) => p.id === id);
        respond<TestAiProviderResponse>("testProviderResponse", {
            success: !provider?.key_unreadable,
            message: provider?.key_unreadable
                ? "API key cannot be decrypted, enter it again"
                : "The provider answered with OK",
        });
    },
    listProviderModels: (_, { respond }) =>
        respond<ListAiProviderModelsResponse>("listProviderModelsResponse", {
            models: ["model-a", "model-b"],
        }),
    getUserAccess: ({ user_ids }, { state, respond }) =>
        respond<GetAiUserAccessResponse>("getUserAccessResponse", {
            records: user_ids.map(
                (user_id) =>
                    state.ai.userAccess.find(
                        (record) => record.user_id === user_id,
                    ) ?? {
                        user_id,
                        access: "default",
                        provider_id: null,
                    },
            ),
        }),
    setUserAccess: (record, { state, respond }) => {
        const access = {
            user_id: record.user_id,
            access: record.access,
            provider_id: record.provider_id,
        };
        state.ai.userAccess = [
            ...state.ai.userAccess.filter((r) => r.user_id !== access.user_id),
            access,
        ];
        respond<SetAiUserAccessResponse>("setUserAccessResponse", {
            record: access,
        });
    },
};
