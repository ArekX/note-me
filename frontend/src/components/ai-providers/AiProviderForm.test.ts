import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import AiProviderForm, { type EditableAiProvider } from "./AiProviderForm.vue";

const provider = (data: Partial<EditableAiProvider>): EditableAiProvider => ({
    id: null,
    name: "Main",
    type: "ollama",
    base_url: "https://ollama.com",
    model: "llama",
    has_key: false,
    is_default: false,
    ...data,
});

const defaultBox = (wrapper: VueWrapper) =>
    wrapper
        .findAll("label")
        .find((l) => l.text() === "Default provider")!
        .get("input");

const save = async (wrapper: VueWrapper) => {
    await wrapper.get("form").trigger("submit");
    await flushPromises();
};

describe("AiProviderForm", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("makes a new provider the default", async () => {
        const wrapper = mount(AiProviderForm, {
            props: { provider: provider({}) },
            attachTo: document.body,
        });
        await defaultBox(wrapper).setValue(true);
        await save(wrapper);
        await vi.waitFor(() =>
            expect(wrapper.emitted("close")).toHaveLength(1),
        );
        expect(
            mockControl.state.ai.providers.map((p) => [p.name, p.is_default]),
        ).toEqual([["Main", true]]);
    });

    it("removes the default from an edited provider", async () => {
        mockControl.state.ai.providers.push({
            ...provider({ id: 7, is_default: true }),
            id: 7,
            key_unreadable: false,
            created_at: 1,
            updated_at: 1,
        });
        const wrapper = mount(AiProviderForm, {
            props: { provider: provider({ id: 7, is_default: true }) },
            attachTo: document.body,
        });
        expect((defaultBox(wrapper).element as HTMLInputElement).checked).toBe(
            true,
        );
        await defaultBox(wrapper).setValue(false);
        await save(wrapper);

        await vi.waitFor(() =>
            expect(wrapper.emitted("close")).toHaveLength(1),
        );
        expect(mockControl.state.ai.providers[0]!.is_default).toBe(false);
    });
});
