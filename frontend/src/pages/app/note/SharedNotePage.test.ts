import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import SharedNotePage from "./SharedNotePage.vue";

vi.mock("vue-router", () => ({
    useRoute: () => ({ name: "note-shared", params: {} }),
    useRouter: () => ({ push: vi.fn() }),
}));

const render = async (id: string) => {
    const wrapper = mount(SharedNotePage, { props: { id } });
    await vi.waitFor(() =>
        expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false),
    );
    return wrapper;
};

describe("SharedNotePage", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("shows a note shared with the user read-only", async () => {
        const wrapper = await render("7");
        expect(wrapper.text()).toContain("Jane's deployment checklist");
        expect(wrapper.text()).toContain("Author: Jane Doe");
        expect(wrapper.find('button[title="Edit"]').exists()).toBe(false);
        expect(wrapper.get(".view-note").classes()).not.toContain(
            "note-normal-width",
        );
    });

    it("shows a note in normal width when its owner chose it", async () => {
        mockControl.state.notes.find((n) => n.id === 7)!.is_wide = false;
        const wrapper = await render("7");
        expect(wrapper.get(".view-note").classes()).toContain(
            "note-normal-width",
        );
    });

    it("refuses notes that are not shared or are protected", async () => {
        expect((await render("1")).text()).toContain(
            "Requested note not found.",
        );

        mockControl.state.notes.find((n) => n.id === 7)!.is_encrypted = true;
        expect((await render("7")).text()).toContain(
            "This note is protected by its owner and cannot be viewed.",
        );
    });
});
