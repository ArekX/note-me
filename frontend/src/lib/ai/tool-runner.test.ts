import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_PASSWORD, mockControl } from "@/test/mock-backend";
import { useAiConsentStore } from "@/stores/ai-consent";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import type { AiToolCallRequest } from "@/types/records";
import { DENIED_TEXT, LOCKED_TEXT } from "./protected-notes";
import { runToolCall } from "./tool-runner";

const getNote = (id: number): AiToolCallRequest => ({
    id: `call-${id}`,
    name: "get_note",
    title: "Read note",
    arguments: { id },
    confirm: false,
    protected: "read",
    browser: false,
    message: {
        namespace: "notes",
        type: "getNote",
        expect: "getNoteResponse",
        payload: { id },
    },
});

const updateNoteText = (id: number, text: string): AiToolCallRequest => ({
    id: "call-update",
    name: "update_note",
    title: "Update note",
    arguments: { id, text },
    confirm: false,
    protected: "write",
    browser: false,
    message: {
        namespace: "notes",
        type: "updateNote",
        expect: "updateNoteResponse",
        payload: { id, data: { text } },
    },
});

const setProtection = (
    id: number,
    isProtected: boolean,
): AiToolCallRequest => ({
    id: "call-protect",
    name: "set_note_protection",
    title: "Change note protection",
    arguments: { id, protected: isProtected },
    confirm: false,
    protected: "protection",
    browser: true,
    message: null,
});

const run = async (call: AiToolCallRequest, conversationId = 1) =>
    runToolCall(call, {
        conversationId,
        service: await useSocketStore().getService(),
    });

// Answers the consent dialog once it is shown.
const answerConsent = async (allowed: boolean) => {
    const consent = useAiConsentStore();
    await vi.waitFor(() => expect(consent.request).not.toBeNull());
    consent.answer(allowed);
};

const unlock = () =>
    useProtectionLockStore().resolveUnlockRequest(MOCK_PASSWORD);

const sent = () =>
    mockControl.log
        .filter((entry) => entry.direction === "out")
        .map((entry) => JSON.stringify(entry.message));

describe("runToolCall", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("runs an ordinary call as the user's message, not as this tab's own", async () => {
        const outcome = await run(getNote(1));
        const sentRequest = mockControl.log.find(
            (entry) =>
                entry.direction === "out" && entry.message.type === "getNote",
        )!.message.requestId;
        expect(useSocketStore().isOwnRequest(sentRequest)).toBe(false);
        expect(outcome.status).toBe("done");
        expect(JSON.parse(outcome.content).record.id).toBe(1);
        expect(outcome.protected).toBeUndefined();
        expect(useAiConsentStore().request).toBeNull();
    });

    it("decrypts protected text only after consent", async () => {
        unlock();
        const running = run(getNote(4));
        await vi.waitFor(() =>
            expect(useAiConsentStore().request).toEqual({
                needsPassword: false,
            }),
        );
        await answerConsent(true);
        const outcome = await running;
        expect(outcome.status).toBe("done");
        expect(outcome.protected).toBe(true);
        expect(JSON.parse(outcome.content).record.note).toContain("IBAN");
        expect(outcome.content).not.toContain(MOCK_PASSWORD);

        // The grant covers the rest of the conversation.
        const again = await run(getNote(4));
        expect(again.status).toBe("done");
        expect(useAiConsentStore().request).toBeNull();
    });

    it("keeps the text when the user denies and asks again in another conversation", async () => {
        unlock();
        const denied = run(getNote(4));
        await answerConsent(false);
        expect(await denied).toEqual({
            status: "declined",
            content: DENIED_TEXT,
        });

        const granted = run(getNote(4), 1);
        await answerConsent(true);
        expect((await granted).status).toBe("done");

        const other = run(getNote(4), 2);
        await answerConsent(false);
        expect((await other).status).toBe("declined");
    });

    it("asks for the password when protection is locked", async () => {
        const running = run(getNote(4));
        await vi.waitFor(() =>
            expect(useAiConsentStore().request?.needsPassword).toBe(true),
        );
        unlock();
        useAiConsentStore().answer(true);
        expect((await running).status).toBe("done");

        // A grant does not survive a lock.
        useProtectionLockStore().lock();
        const locked = run(getNote(4));
        await vi.waitFor(() =>
            expect(useAiConsentStore().request?.needsPassword).toBe(true),
        );
        useAiConsentStore().answer(false);
        expect((await locked).status).toBe("declined");
    });

    it("encrypts new text of a protected note and never sends the password to the model", async () => {
        unlock();
        const running = run(updateNoteText(4, "New secret"));
        await answerConsent(true);
        const outcome = await running;
        expect(outcome.status).toBe("done");
        expect(outcome.content).not.toContain(MOCK_PASSWORD);
        const update = sent().find((message) =>
            message.includes('"type":"updateNote"'),
        )!;
        expect(update).not.toContain("New secret");
        expect(update).toContain("mock:");
        expect(mockControl.state.notes.find((n) => n.id === 4)!.note).toMatch(
            /^mock:/,
        );

        // An unprotected note needs no consent.
        expect((await run(updateNoteText(1, "Plain"))).status).toBe("done");
    });

    it("changes protection only with the grant and unlocked protection", async () => {
        expect(await run(setProtection(1, true))).toEqual({
            status: "failed",
            content: LOCKED_TEXT,
        });
        expect(useAiConsentStore().request).toBeNull();

        unlock();
        const denied = run(setProtection(1, true));
        await answerConsent(false);
        expect((await denied).status).toBe("declined");
        expect(
            mockControl.state.notes.find((n) => n.id === 1)!.is_encrypted,
        ).toBe(false);

        const granted = run(setProtection(1, true));
        await answerConsent(true);
        const outcome = await granted;
        expect(JSON.parse(outcome.content)).toEqual({
            id: 1,
            protected: true,
            changed: true,
        });
        const note = mockControl.state.notes.find((n) => n.id === 1)!;
        expect(note.is_encrypted).toBe(true);
        expect(note.note).toMatch(/^mock:/);
        expect(outcome.content).not.toContain(MOCK_PASSWORD);

        const removed = await run(setProtection(1, false));
        expect(JSON.parse(removed.content).changed).toBe(true);
        expect(note.is_encrypted).toBe(false);
        expect(note.note).not.toMatch(/^mock:/);
    });

    it("reports a failed call", async () => {
        const outcome = await run(getNote(999));
        expect(outcome).toEqual({
            status: "failed",
            content: "Requested note not found.",
        });
    });
});
