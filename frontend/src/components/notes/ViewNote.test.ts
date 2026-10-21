import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { MOCK_PASSWORD, mockControl } from "@/test/mock-backend";
import { runToolCall } from "@/lib/ai/tool-runner";
import { useAiConsentStore } from "@/stores/ai-consent";
import { useNotesStore } from "@/stores/notes";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import type { UpdateNoteMessage, UpdateNoteResponse } from "@/types/messages";
import ViewNote from "./ViewNote.vue";

vi.mock("vue-router", async (importOriginal) => ({
    ...(await importOriginal<typeof import("vue-router")>()),
    useRoute: () => ({ name: "note-view", params: { id: "1" } }),
    useRouter: () => ({ push: vi.fn() }),
}));

const mountNote = async () => {
    const record = await useNotesStore().getNote(1, false);
    const wrapper = mount(ViewNote, { props: { record } });
    await flushPromises();
    return wrapper;
};

describe("ViewNote", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("reloads when the assistant protects the open note in this tab", async () => {
        const wrapper = await mountNote();
        useProtectionLockStore().resolveUnlockRequest(MOCK_PASSWORD);

        const running = runToolCall(
            {
                id: "call-1",
                name: "set_note_protection",
                title: "Change note protection",
                arguments: { id: 1, protected: true },
                confirm: false,
                protected: "protection",
                browser: true,
                message: null,
            },
            {
                conversationId: 1,
                service: await useSocketStore().getService(),
            },
        );
        await vi.waitFor(() =>
            expect(useAiConsentStore().request).not.toBeNull(),
        );
        useAiConsentStore().answer(true);
        expect((await running).status).toBe("done");

        await vi.waitFor(() =>
            expect(wrapper.emitted("reload")).toHaveLength(1),
        );
        expect(wrapper.text()).not.toContain("mock:");
        expect(
            mockControl.state.notes.find((n) => n.id === 1)!.is_encrypted,
        ).toBe(true);
    });

    it("applies a title change from the assistant in place", async () => {
        const wrapper = await mountNote();
        const service = await useSocketStore().getService();
        await service.sendMessage<UpdateNoteMessage, UpdateNoteResponse>(
            "notes",
            "updateNote",
            {
                data: { id: 1, data: { title: "Renamed by the assistant" } },
                expect: "updateNoteResponse",
                notOwn: true,
            },
        );
        await vi.waitFor(() =>
            expect(wrapper.get("h1").text()).toBe("Renamed by the assistant"),
        );
        expect(wrapper.emitted("reload")).toBeUndefined();
    });
});
