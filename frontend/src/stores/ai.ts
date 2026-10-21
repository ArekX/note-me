import { markRaw, ref } from "vue";
import { defineStore } from "pinia";
import { useLoadMore, type LoadMoreList } from "@/composables/useLoadMore";
import { currentPage } from "@/lib/ai/current-page";
import { runToolCall } from "@/lib/ai/tool-runner";
import { router } from "@/router";
import type {
    AiFrontendResponse,
    CancelAiTurnMessage,
    CancelAiTurnResponse,
    DeleteAiConversationMessage,
    DeleteAiConversationResponse,
    FindAiConversationsMessage,
    FindAiConversationsResponse,
    GetAiToolsMessage,
    GetAiToolsResponse,
    GetAiAccessMessage,
    GetAiAccessResponse,
    GetAiConversationMessage,
    GetAiConversationResponse,
    RenameAiConversationMessage,
    RenameAiConversationResponse,
    SendAiMessageMessage,
    SendAiMessageResponse,
    SubmitAiToolResultsMessage,
    SubmitAiToolResultsResponse,
} from "@/types/messages";
import type {
    AiConversationRecord,
    AiMessageRecord,
    AiToolCallRequest,
    AiToolResult,
    AiToolStatus,
} from "@/types/records";
import { useAiConsentStore } from "./ai-consent";
import { useAiPasswordStore } from "./ai-password";
import { useSocketStore } from "./socket";
import { useToastStore } from "./toast";

export const CONVERSATIONS_PAGE_SIZE = 20;
export const DECLINED_TEXT = "The user declined this action.";

export interface AiStep {
    call: AiToolCallRequest;
    // waiting: Allow / Deny is shown.
    status: "waiting" | "running" | AiToolStatus;
    result: string | null;
    protected: boolean;
}

export interface AiRound {
    text: string;
    steps: AiStep[];
}

// The turn this tab runs; other tabs only reload the stored conversation.
export interface AiTurn {
    conversationId: number;
    turnId: string;
    rounds: AiRound[];
}

export interface OpenConversation {
    conversation: AiConversationRecord;
    messages: AiMessageRecord[];
    isLocked: boolean;
    isRunning: boolean;
}

export const useAiStore = defineStore("ai", () => {
    const access = ref({ enabled: false });
    const isAccessLoaded = ref(false);
    const current = ref<OpenConversation | null>(null);
    const turn = ref<AiTurn | null>(null);
    const lastError = ref("");
    const toolTitles = ref<Record<string, string>>({});
    const confirmations = new Map<string, (allowed: boolean) => void>();
    let unsubscribe: (() => void) | null = null;

    const service = () => useSocketStore().getService();

    // Raw, so the store keeps its refs for SidebarList.
    const conversations: LoadMoreList<AiConversationRecord> = useLoadMore({
        limit: CONVERSATIONS_PAGE_SIZE,
        onLoadMore: async (): Promise<AiConversationRecord[]> => {
            const page =
                Math.floor(
                    conversations.records.value.length /
                        CONVERSATIONS_PAGE_SIZE,
                ) + 1;
            const { records } = await (
                await service()
            ).sendMessage<
                FindAiConversationsMessage,
                FindAiConversationsResponse
            >("ai", "findConversations", {
                data: { page },
                expect: "findConversationsResponse",
            });
            return records.results;
        },
    });

    const loadAccess = async () => {
        const response = await (
            await service()
        ).sendMessage<GetAiAccessMessage, GetAiAccessResponse>(
            "ai",
            "getAccess",
            { expect: "getAccessResponse" },
        );
        access.value = { enabled: response.enabled };
        isAccessLoaded.value = true;
        if (access.value.enabled) {
            void loadToolTitles();
            if (current.value) {
                void reloadCurrent();
            }
        } else {
            current.value = null;
            conversations.reset();
        }
    };

    // Stored steps keep only the tool name.
    const loadToolTitles = async () => {
        const { tools } = await (
            await service()
        ).sendMessage<GetAiToolsMessage, GetAiToolsResponse>("ai", "getTools", {
            expect: "getToolsResponse",
        });
        toolTitles.value = Object.fromEntries(
            tools.map((tool) => [tool.name, tool.title]),
        );
    };

    const titleOf = (name: string) => toolTitles.value[name] ?? name;

    const fetchConversation = async (id: number) => {
        const response = await (
            await service()
        ).sendMessage<GetAiConversationMessage, GetAiConversationResponse>(
            "ai",
            "getConversation",
            { data: { id }, expect: "getConversationResponse" },
        );
        return {
            conversation: response.conversation,
            messages: response.messages,
            isLocked: response.is_locked,
            isRunning: response.is_running,
        };
    };

    const open = async (id: number) => {
        lastError.value = "";
        current.value = await fetchConversation(id);
    };

    const reloadCurrent = async () => {
        const id = current.value?.conversation.id;
        if (id === undefined) {
            return;
        }
        try {
            const loaded = await fetchConversation(id);
            if (current.value?.conversation.id === id) {
                current.value = loaded;
            }
        } catch {
            current.value = null;
        }
    };

    const close = () => {
        current.value = null;
        lastError.value = "";
    };

    const isRunningHere = (conversationId: number) =>
        turn.value?.conversationId === conversationId;

    const send = async (text: string) => {
        lastError.value = "";
        const conversationId = current.value?.conversation.id ?? null;
        const response = await (
            await service()
        ).sendMessage<SendAiMessageMessage, SendAiMessageResponse>(
            "ai",
            "sendMessage",
            {
                data: {
                    conversation_id: conversationId,
                    text,
                    page: currentPage(router.currentRoute.value),
                },
                expect: "sendMessageResponse",
            },
        );
        const message: AiMessageRecord = {
            id: -Date.now(),
            role: "user",
            content: text,
            tool_calls: null,
            tool_call_id: null,
            tool_name: null,
            tool_status: null,
            created_at: Math.floor(Date.now() / 1000),
        };
        current.value = {
            conversation: response.conversation,
            messages: [...(current.value?.messages ?? []), message],
            isLocked: false,
            isRunning: true,
        };
        turn.value = {
            conversationId: response.conversation.id,
            turnId: response.turn_id,
            rounds: [{ text: "", steps: [] }],
        };
        if (conversationId === null) {
            void conversations.reload();
        }
    };

    const cancel = async () => {
        const id = current.value?.conversation.id;
        if (id === undefined) {
            return;
        }
        for (const resolve of confirmations.values()) {
            resolve(false);
        }
        await (
            await service()
        ).sendMessage<CancelAiTurnMessage, CancelAiTurnResponse>(
            "ai",
            "cancelTurn",
            { data: { conversation_id: id }, expect: "cancelTurnResponse" },
        );
    };

    const rename = async (id: number, title: string) => {
        await (
            await service()
        ).sendMessage<
            RenameAiConversationMessage,
            RenameAiConversationResponse
        >("ai", "renameConversation", {
            data: { id, title },
            expect: "renameConversationResponse",
        });
    };

    const remove = async (id: number) => {
        await (
            await service()
        ).sendMessage<
            DeleteAiConversationMessage,
            DeleteAiConversationResponse
        >("ai", "deleteConversation", {
            data: { id },
            expect: "deleteConversationResponse",
        });
    };

    const decide = (callId: string, allowed: boolean) => {
        confirmations.get(callId)?.(allowed);
        confirmations.delete(callId);
    };

    const confirm = (callId: string) =>
        new Promise<boolean>((resolve) => confirmations.set(callId, resolve));

    // Calls run one after another, so a confirmation or the protected notes
    // dialog never overlaps the next call.
    const runSteps = async (
        conversationId: number,
        turnId: string,
        calls: AiToolCallRequest[],
    ) => {
        const round = turn.value?.rounds.at(-1);
        if (!round) {
            return;
        }
        round.steps = calls.map((call) => ({
            call,
            status: "running",
            result: null,
            protected: false,
        }));
        const steps = round.steps;
        turn.value!.rounds.push({ text: "", steps: [] });

        const results: AiToolResult[] = [];
        for (const step of steps) {
            if (turn.value?.turnId !== turnId) {
                return;
            }
            if (step.call.confirm) {
                step.status = "waiting";
                if (!(await confirm(step.call.id))) {
                    step.status = "declined";
                    step.result = DECLINED_TEXT;
                    results.push({
                        id: step.call.id,
                        status: "declined",
                        content: DECLINED_TEXT,
                    });
                    continue;
                }
                step.status = "running";
            }
            const outcome = await runToolCall(step.call, {
                conversationId,
                service: await service(),
            });
            step.status = outcome.status;
            step.result = outcome.content;
            step.protected = outcome.protected ?? false;
            results.push({ id: step.call.id, ...outcome });
        }
        if (turn.value?.turnId !== turnId) {
            return;
        }
        try {
            await (
                await service()
            ).sendMessage<
                SubmitAiToolResultsMessage,
                SubmitAiToolResultsResponse
            >("ai", "submitToolResults", {
                data: {
                    conversation_id: conversationId,
                    turn_id: turnId,
                    results,
                },
                expect: "submitToolResultsResponse",
            });
        } catch (error) {
            useToastStore().reportError(error);
        }
    };

    const endTurn = (turnId: string, error: string) => {
        if (turn.value?.turnId !== turnId) {
            return;
        }
        turn.value = null;
        lastError.value = error;
        confirmations.clear();
        void reloadCurrent();
    };

    const init = async () => {
        const socket = await service();
        unsubscribe ??= socket.listen<AiFrontendResponse>({
            ai: {
                accessChanged: () => void loadAccess(),
                conversationUpdated: ({ conversation_id, deleted }) => {
                    void conversations.reload();
                    if (current.value?.conversation.id !== conversation_id) {
                        return;
                    }
                    if (deleted) {
                        current.value = null;
                    } else if (!isRunningHere(conversation_id)) {
                        void reloadCurrent();
                    }
                },
                messageChunk: ({ turn_id, text }) => {
                    if (turn.value?.turnId === turn_id) {
                        turn.value.rounds.at(-1)!.text += text;
                    }
                },
                toolCallsRequested: ({ conversation_id, turn_id, calls }) => {
                    if (turn.value?.turnId === turn_id) {
                        void runSteps(conversation_id, turn_id, calls);
                    }
                },
                turnFinished: ({ turn_id }) => endTurn(turn_id, ""),
                turnFailed: ({ turn_id, message }) => endTurn(turn_id, message),
            },
        });
        await loadAccess();
    };

    const reset = () => {
        unsubscribe?.();
        unsubscribe = null;
        access.value = { enabled: false };
        isAccessLoaded.value = false;
        current.value = null;
        turn.value = null;
        lastError.value = "";
        toolTitles.value = {};
        confirmations.clear();
        conversations.reset();
        useAiConsentStore().reset();
        useAiPasswordStore().answer(null);
    };

    return {
        access,
        isAccessLoaded,
        conversations: markRaw(conversations),
        current,
        turn,
        lastError,
        init,
        loadAccess,
        open,
        close,
        send,
        cancel,
        rename,
        remove,
        allow: (callId: string) => decide(callId, true),
        deny: (callId: string) => decide(callId, false),
        isRunningHere,
        titleOf,
        reset,
    };
});
