import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { api } from "@/lib/api";
import { mockControl, mockPublicNote } from "@/test/mock-backend";
import PublicNotePage from "./PublicNotePage.vue";

vi.mock("vue-router", () => ({
    useRoute: () => ({ name: "public-note", params: {} }),
    useRouter: () => ({ push: vi.fn() }),
}));

const render = async (identifier: string) => {
    const wrapper = mount(PublicNotePage, { props: { identifier } });
    await flushPromises();
    await vi.waitFor(() =>
        expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false),
    );
    return wrapper;
};

describe("PublicNotePage", () => {
    beforeEach(() => {
        vi.spyOn(api, "getPublicNote").mockImplementation(async (identifier) =>
            mockPublicNote(mockControl.state, identifier),
        );
    });

    it("shows the shared note read-only with its author", async () => {
        const wrapper = await render("mock-public-share");
        expect(wrapper.text()).toContain("Book list");
        expect(wrapper.text()).toContain("Author: Administrator");
        expect(wrapper.find('button[title="Edit"]').exists()).toBe(false);
        expect(wrapper.find(".tag").classes()).toContain("pointer-events-none");
        expect(document.title).toBe("NoteMe - Book list");
    });

    it("explains a missing or protected note", async () => {
        expect((await render("nope")).text()).toContain("Note not found.");

        mockControl.state.notes.find((n) => n.id === 3)!.is_encrypted = true;
        expect((await render("mock-public-share")).text()).toContain(
            "This note is protected by its owner and cannot be viewed.",
        );
    });
});
