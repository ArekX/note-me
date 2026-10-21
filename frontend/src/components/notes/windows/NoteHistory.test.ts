import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import NoteHistory from "./NoteHistory.vue";

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const waitForText = (wrapper: VueWrapper, text: string) =>
    vi.waitFor(() => expect(wrapper.text()).toContain(text));

const clickButton = async (wrapper: VueWrapper, text: string) => {
    const button = wrapper.findAll("button").find((b) => b.text() === text);
    await button!.trigger("click");
    await flushPromises();
};

describe("NoteHistory", () => {
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

    const mountHistory = () =>
        mount(NoteHistory, {
            props: { noteId: 1, currentText: "# Current" },
            attachTo: document.body,
        });

    it("lists versions newest first and shows the diff to the current text", async () => {
        const wrapper = mountHistory();
        await waitForText(wrapper, "Version 2");
        const versions = wrapper
            .findAll("[data-test=side-tab-item] h1")
            .map((h) => h.text());
        expect(versions).toEqual(["Version 2", "Version 1"]);

        await waitForText(wrapper, "Markdown");
        await clickButton(wrapper, "Diff");
        await waitForText(wrapper, "Line changed");
        expect(wrapper.find(".diff-viewer").text()).toContain("# Current");
    });

    it("reverts to a version and closes", async () => {
        const wrapper = mountHistory();
        await waitForText(wrapper, "Version 2");
        await waitForText(wrapper, "Markdown");

        await wrapper
            .get('button[title="Revert to this version"]')
            .trigger("click");
        await clickButton(wrapper, "Revert to this version");

        await vi.waitFor(() =>
            expect(wrapper.emitted("close")).toHaveLength(1),
        );
        expect(
            mockControl.state.history
                .filter((h) => h.note_id === 1)
                .map((h) => h.version),
        ).toContain("Version 3 (before reversal)");
    });

    it("deletes a version and reloads the list", async () => {
        const wrapper = mountHistory();
        await waitForText(wrapper, "Version 2");
        await waitForText(wrapper, "Markdown");

        await wrapper
            .get('button[title="Delete this version"]')
            .trigger("click");
        await clickButton(wrapper, "Delete this version");

        await vi.waitFor(() =>
            expect(wrapper.text()).not.toContain("Version 2"),
        );
        expect(wrapper.text()).toContain("Version 1");
    });
});
