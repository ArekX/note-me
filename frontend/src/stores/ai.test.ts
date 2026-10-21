import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "@/test/mock-backend";
import type {
    AiMessageChunk,
    AiToolCallsRequested,
    AiTurnFailed,
    AiTurnFinished,
} from "@/types/messages";
import type { AiToolCallRequest } from "@/types/records";
import { DECLINED_TEXT, useAiStore } from "./ai";
import { useSocketStore } from "./socket";

const deleteFolder: AiToolCallRequest = {
    id: "call-delete",
    name: "delete_folder",
    title: "Delete folder",
    arguments: { id: 1 },
    confirm: true,
    protected: "",
    browser: false,
    message: {
        namespace: "groups",
        type: "deleteGroup",
        expect: "deleteGroupResponse",
        payload: { id: 1 },
    },
};

const getTree: AiToolCallRequest = {
    id: "call-tree",
    name: "get_tree",
    title: "List folder",
    arguments: {},
    confirm: false,
    protected: "",
    browser: false,
    message: {
        namespace: "tree",
        type: "getTree",
        expect: "getTreeResponse",
        payload: {},
    },
};

const startTurn = async () => {
    const ai = useAiStore();
    await ai.init();
    await ai.send("Clean up my folders");
    return {
        ai,
        turn: {
            conversation_id: ai.turn!.conversationId,
            turn_id: ai.turn!.turnId,
        },
    };
};

describe("ai store", () => {
    beforeEach(async () => {
        mockControl.state.ai.access = { enabled: true };
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("assembles the streamed answer of this tab's turn", async () => {
        const { ai, turn } = await startTurn();
        expect(ai.current?.conversation.title).toBe("Clean up my folders");
        const sent = mockControl.log.find(
            (entry) => entry.message.type === "sendMessage",
        )!.message;
        expect(sent.page).toEqual({ name: "", note_id: null });
        expect(ai.current?.messages.at(-1)?.content).toBe(
            "Clean up my folders",
        );

        mockControl.push<AiMessageChunk>("ai", "messageChunk", {
            ...turn,
            text: "Looking ",
        });
        mockControl.push<AiMessageChunk>("ai", "messageChunk", {
            ...turn,
            text: "now.",
        });
        mockControl.push<AiMessageChunk>("ai", "messageChunk", {
            conversation_id: 9,
            turn_id: "other",
            text: "Not mine",
        });
        await vi.waitFor(() =>
            expect(ai.turn?.rounds[0]?.text).toBe("Looking now."),
        );

        mockControl.push<AiTurnFailed>("ai", "turnFailed", {
            ...turn,
            message: "The AI provider could not answer: Rate limited",
        });
        await vi.waitFor(() => expect(ai.turn).toBeNull());
        expect(ai.lastError).toBe(
            "The AI provider could not answer: Rate limited",
        );
    });

    it("waits for Allow or Deny before a confirmed call and submits every result", async () => {
        const { ai, turn } = await startTurn();
        mockControl.push<AiToolCallsRequested>("ai", "toolCallsRequested", {
            ...turn,
            calls: [deleteFolder, getTree],
        });

        const steps = () => ai.turn!.rounds[0]!.steps;
        await vi.waitFor(() => expect(steps()[0]?.status).toBe("waiting"));
        expect(steps()[1]?.status).toBe("running");
        expect(
            mockControl.log.some(
                (entry) => entry.message.type === "deleteGroup",
            ),
        ).toBe(false);

        ai.deny("call-delete");
        await vi.waitFor(() =>
            expect(mockControl.state.ai.submitted).toHaveLength(1),
        );
        const [declined, done] = mockControl.state.ai.submitted[0]!;
        expect(declined).toEqual({
            id: "call-delete",
            status: "declined",
            content: DECLINED_TEXT,
        });
        expect(done?.status).toBe("done");
        expect(
            mockControl.log.some(
                (entry) => entry.message.type === "deleteGroup",
            ),
        ).toBe(false);
        expect(steps().map((step) => step.status)).toEqual([
            "declined",
            "done",
        ]);

        // The next round's calls go to a new round.
        mockControl.push<AiToolCallsRequested>("ai", "toolCallsRequested", {
            ...turn,
            calls: [{ ...deleteFolder, id: "call-again" }],
        });
        await vi.waitFor(() =>
            expect(ai.turn!.rounds[1]?.steps[0]?.status).toBe("waiting"),
        );
        ai.allow("call-again");
        await vi.waitFor(() =>
            expect(mockControl.state.ai.submitted).toHaveLength(2),
        );
        expect(
            mockControl.log.some(
                (entry) => entry.message.type === "deleteGroup",
            ),
        ).toBe(true);

        mockControl.push<AiTurnFinished>("ai", "turnFinished", {
            ...turn,
            cancelled: false,
        });
        await vi.waitFor(() => expect(ai.turn).toBeNull());
        expect(ai.lastError).toBe("");
    });

    it("hides the assistant when access ends", async () => {
        const ai = useAiStore();
        await ai.init();
        expect(ai.access.enabled).toBe(true);

        mockControl.state.ai.access = { enabled: false };
        mockControl.push("ai", "accessChanged");
        await vi.waitFor(() => expect(ai.access.enabled).toBe(false));
        expect(ai.current).toBeNull();
    });
});
