import type { Message } from "./base";
import type {
    AiConversationRecord,
    AiMessageRecord,
    AiOpenPage,
    AiProviderRecord,
    AiProviderType,
    AiToolCallRequest,
    AiToolInfo,
    AiToolResult,
    AiUserAccessRecord,
    Paged,
} from "../records";
import type { AiProviderRequest } from "@/schemas/ai";

type AiMessage<Type extends string, Data = unknown> = Message<"ai", Type, Data>;

export type GetAiProvidersMessage = AiMessage<"getProviders">;
export type GetAiProvidersResponse = AiMessage<
    "getProvidersResponse",
    { providers: AiProviderRecord[] }
>;

export type CreateAiProviderMessage = AiMessage<
    "createProvider",
    { data: AiProviderRequest }
>;
export type CreateAiProviderResponse = AiMessage<
    "createProviderResponse",
    { record: AiProviderRecord }
>;

export type UpdateAiProviderMessage = AiMessage<
    "updateProvider",
    { id: number; data: AiProviderRequest }
>;
export type UpdateAiProviderResponse = AiMessage<
    "updateProviderResponse",
    { record: AiProviderRecord }
>;

export type DeleteAiProviderMessage = AiMessage<
    "deleteProvider",
    { id: number }
>;
export type DeleteAiProviderResponse = AiMessage<
    "deleteProviderResponse",
    { deleted_id: number }
>;

export type SetDefaultAiProviderMessage = AiMessage<
    "setDefaultProvider",
    { id: number | null }
>;
export type SetDefaultAiProviderResponse = AiMessage<
    "setDefaultProviderResponse",
    { id: number | null }
>;

export type TestAiProviderMessage = AiMessage<"testProvider", { id: number }>;
export type TestAiProviderResponse = AiMessage<
    "testProviderResponse",
    { success: boolean; message: string }
>;

// Without api_key the stored key of provider_id is used.
export type ListAiProviderModelsMessage = AiMessage<
    "listProviderModels",
    {
        provider_id: number | null;
        provider_type: AiProviderType;
        base_url: string;
        api_key: string | null;
    }
>;
export type ListAiProviderModelsResponse = AiMessage<
    "listProviderModelsResponse",
    { models: string[] }
>;

export type GetAiUserAccessMessage = AiMessage<
    "getUserAccess",
    { user_ids: number[] }
>;
export type GetAiUserAccessResponse = AiMessage<
    "getUserAccessResponse",
    { records: AiUserAccessRecord[] }
>;

export type SetAiUserAccessMessage = AiMessage<
    "setUserAccess",
    AiUserAccessRecord
>;
export type SetAiUserAccessResponse = AiMessage<
    "setUserAccessResponse",
    { record: AiUserAccessRecord }
>;

export type GetAiAccessMessage = AiMessage<"getAccess">;
export type GetAiAccessResponse = AiMessage<
    "getAccessResponse",
    { enabled: boolean }
>;

export type FindAiConversationsMessage = AiMessage<
    "findConversations",
    { page: number }
>;
export type FindAiConversationsResponse = AiMessage<
    "findConversationsResponse",
    { records: Paged<AiConversationRecord> }
>;

export type GetAiToolsMessage = AiMessage<"getTools">;
export type GetAiToolsResponse = AiMessage<
    "getToolsResponse",
    { tools: AiToolInfo[] }
>;

export type GetAiConversationMessage = AiMessage<
    "getConversation",
    { id: number }
>;
export type GetAiConversationResponse = AiMessage<
    "getConversationResponse",
    {
        conversation: AiConversationRecord;
        messages: AiMessageRecord[];
        is_locked: boolean;
        is_running: boolean;
    }
>;

export type SendAiMessageMessage = AiMessage<
    "sendMessage",
    { conversation_id: number | null; text: string; page: AiOpenPage }
>;
export type SendAiMessageResponse = AiMessage<
    "sendMessageResponse",
    { conversation: AiConversationRecord; turn_id: string }
>;

export type SubmitAiToolResultsMessage = AiMessage<
    "submitToolResults",
    { conversation_id: number; turn_id: string; results: AiToolResult[] }
>;
export type SubmitAiToolResultsResponse =
    AiMessage<"submitToolResultsResponse">;

export type CancelAiTurnMessage = AiMessage<
    "cancelTurn",
    { conversation_id: number }
>;
export type CancelAiTurnResponse = AiMessage<
    "cancelTurnResponse",
    { cancelled: boolean }
>;

export type RenameAiConversationMessage = AiMessage<
    "renameConversation",
    { id: number; title: string }
>;
export type RenameAiConversationResponse = AiMessage<
    "renameConversationResponse",
    { id: number; title: string }
>;

export type DeleteAiConversationMessage = AiMessage<
    "deleteConversation",
    { id: number }
>;
export type DeleteAiConversationResponse = AiMessage<
    "deleteConversationResponse",
    { deleted_id: number }
>;

interface TurnEvent {
    conversation_id: number;
    turn_id: string;
}

export type AiTurnStarted = AiMessage<"turnStarted", TurnEvent>;
export type AiMessageChunk = AiMessage<
    "messageChunk",
    TurnEvent & { text: string }
>;
export type AiToolCallsRequested = AiMessage<
    "toolCallsRequested",
    TurnEvent & { calls: AiToolCallRequest[] }
>;
export type AiTurnFinished = AiMessage<
    "turnFinished",
    TurnEvent & { cancelled: boolean }
>;
export type AiTurnFailed = AiMessage<
    "turnFailed",
    TurnEvent & { message: string }
>;
export type AiConversationUpdated = AiMessage<
    "conversationUpdated",
    { conversation_id: number; deleted: boolean }
>;
export type AiAccessChanged = AiMessage<"accessChanged">;

export type AiFrontendMessage =
    | GetAiProvidersMessage
    | CreateAiProviderMessage
    | UpdateAiProviderMessage
    | DeleteAiProviderMessage
    | SetDefaultAiProviderMessage
    | TestAiProviderMessage
    | ListAiProviderModelsMessage
    | GetAiUserAccessMessage
    | SetAiUserAccessMessage
    | GetAiAccessMessage
    | FindAiConversationsMessage
    | GetAiToolsMessage
    | GetAiConversationMessage
    | SendAiMessageMessage
    | SubmitAiToolResultsMessage
    | CancelAiTurnMessage
    | RenameAiConversationMessage
    | DeleteAiConversationMessage;

export type AiFrontendResponse =
    | GetAiProvidersResponse
    | CreateAiProviderResponse
    | UpdateAiProviderResponse
    | DeleteAiProviderResponse
    | SetDefaultAiProviderResponse
    | TestAiProviderResponse
    | ListAiProviderModelsResponse
    | GetAiUserAccessResponse
    | SetAiUserAccessResponse
    | GetAiAccessResponse
    | FindAiConversationsResponse
    | GetAiToolsResponse
    | GetAiConversationResponse
    | SendAiMessageResponse
    | SubmitAiToolResultsResponse
    | CancelAiTurnResponse
    | RenameAiConversationResponse
    | DeleteAiConversationResponse
    | AiTurnStarted
    | AiMessageChunk
    | AiToolCallsRequested
    | AiTurnFinished
    | AiTurnFailed
    | AiConversationUpdated
    | AiAccessChanged;
