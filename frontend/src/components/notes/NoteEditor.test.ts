import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { TOP_BAR_ACTIONS_ID } from "@/composables/useTopBar";
import { useSocketStore } from "@/stores/socket";
import { useUserStore } from "@/stores/user";
import type { UpdateNoteResponse } from "@/types/messages";
import type { PreferredEditor } from "@/types/records";
import NoteEditor from "./NoteEditor.vue";

vi.mock("vue-router", () => ({
    useRoute: () => ({ name: "note-edit", params: {} }),
    useRouter: () => ({ push: vi.fn() }),
    onBeforeRouteLeave: vi.fn(),
    onBeforeRouteUpdate: vi.fn(),
}));

const mountEditor = () => {
    const note = mockControl.state.notes.find((n) => n.id === 1)!;
    return mount(NoteEditor, {
        attachTo: document.body,
        props: {
            note: {
                id: note.id,
                title: note.title,
                note: note.note,
                is_encrypted: false,
                is_wide: note.is_wide ?? true,
                tags: note.tags,
                group_id: note.group_id,
                group_name: null,
            },
        },
    });
};

const preferEditor = (preferred_editor: PreferredEditor) =>
    useUserStore().setSession({
        user: { ...mockControl.state.currentUser, preferred_editor },
        permissions: [],
        required_steps: [],
    });

const topBarButton = (title: string) =>
    document.querySelector<HTMLButtonElement>(
        `#${TOP_BAR_ACTIONS_ID} button[title="${title}"]`,
    );

describe("NoteEditor", () => {
    beforeEach(async () => {
        const actions = document.createElement("div");
        actions.id = TOP_BAR_ACTIONS_ID;
        document.body.appendChild(actions);
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("switches between wide and normal width and saves it", async () => {
        const wrapper = mountEditor();
        const editor = () => wrapper.get(".note-editor");
        await vi.waitFor(() => expect(topBarButton("Save")).not.toBeNull());
        expect(editor().classes()).not.toContain("note-normal-width");
        expect(topBarButton("Protect")).toBeNull();

        await wrapper.get('button[title="Use normal width"]').trigger("click");
        expect(editor().classes()).toContain("note-normal-width");

        topBarButton("Save")!.click();
        await vi.waitFor(() =>
            expect(
                mockControl.state.notes.find((n) => n.id === 1)!.is_wide,
            ).toBe(false),
        );

        await wrapper.get('button[title="Use full width"]').trigger("click");
        expect(editor().classes()).not.toContain("note-normal-width");
        wrapper.unmount();
    });

    it("opens in the editor the user prefers, rich by default", async () => {
        const rich = mountEditor();
        await vi.waitFor(() =>
            expect(rich.find(".rich-editor .ProseMirror").exists()).toBe(true),
        );
        expect(rich.find(".text-editor").exists()).toBe(false);
        rich.unmount();

        preferEditor("source");
        const source = mountEditor();
        expect(source.find(".text-editor").exists()).toBe(true);
        expect(source.find(".rich-editor").exists()).toBe(false);
        source.unmount();
    });

    it("switches between rich, source and preview", async () => {
        preferEditor("source");
        const wrapper = mountEditor();
        expect(wrapper.find(".text-editor").exists()).toBe(true);

        await wrapper.get('button[title="Preview"]').trigger("click");
        expect(wrapper.find(".text-editor").exists()).toBe(false);
        expect(wrapper.find(".markdown-viewer").exists()).toBe(true);
        expect(
            wrapper
                .findAll('[aria-label="Formatting"] button')
                .every((button) => button.attributes("disabled") !== undefined),
        ).toBe(true);

        await wrapper.get('button[title="Rich text"]').trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.find(".rich-editor .ProseMirror").exists()).toBe(
                true,
            ),
        );
        expect(wrapper.find(".text-editor").exists()).toBe(false);

        await wrapper.get('button[title="Markdown source"]').trigger("click");
        expect(wrapper.find(".text-editor").exists()).toBe(true);
        expect(wrapper.find(".rich-editor").exists()).toBe(false);
        wrapper.unmount();
    });

    it.each(["rich", "source"] as const)(
        "opens the dialog of a toolbar item that needs setting up (%s)",
        async (editor) => {
            HTMLDialogElement.prototype.showModal = function () {
                this.open = true;
            };
            preferEditor(editor);
            const wrapper = mountEditor();
            await vi.waitFor(() =>
                expect(
                    wrapper.find(".rich-editor, .text-editor").exists(),
                ).toBe(true),
            );
            expect(wrapper.find("dialog").exists()).toBe(false);

            await wrapper.get('button[title="Table..."]').trigger("click");
            expect(wrapper.get("dialog").text()).toContain("Insert table");

            await wrapper
                .findAll("dialog button")
                .find((button) => button.text() === "Cancel")!
                .trigger("click");
            expect(wrapper.find("dialog").exists()).toBe(false);
            wrapper.unmount();
        },
    );

    describe("changes made elsewhere", () => {
        const pushUpdate = (data: UpdateNoteResponse["updated_data"]) =>
            mockControl.push<UpdateNoteResponse>(
                "notes",
                "updateNoteResponse",
                {
                    updated_id: 1,
                    updated_data: data,
                },
            );
        const banner = (wrapper: ReturnType<typeof mountEditor>) =>
            wrapper.find('[role="alert"]');
        const editTitle = async (wrapper: ReturnType<typeof mountEditor>) => {
            const input = wrapper.get<HTMLInputElement>(".title-editor");
            input.element.value = "Mine";
            await input.trigger("input");
        };
        const button = (
            wrapper: ReturnType<typeof mountEditor>,
            text: string,
        ) => wrapper.findAll("button").find((b) => b.text() === text)!;

        it("update in place without unsaved edits", async () => {
            const wrapper = mountEditor();
            await vi.waitFor(() => expect(topBarButton("Save")).not.toBeNull());

            pushUpdate({ title: "Renamed elsewhere" });
            await vi.waitFor(() =>
                expect(
                    wrapper.get<HTMLInputElement>(".title-editor").element
                        .value,
                ).toBe("Renamed elsewhere"),
            );
            expect(banner(wrapper).exists()).toBe(false);

            pushUpdate({ text: "New text" });
            await vi.waitFor(() =>
                expect(wrapper.emitted("reload")).toHaveLength(1),
            );
            expect(banner(wrapper).exists()).toBe(false);
            wrapper.unmount();
        });

        it("keep unsaved edits behind a banner", async () => {
            const wrapper = mountEditor();
            await vi.waitFor(() => expect(topBarButton("Save")).not.toBeNull());
            await editTitle(wrapper);

            pushUpdate({ title: "Renamed elsewhere", text: "New text" });
            await vi.waitFor(() => expect(banner(wrapper).exists()).toBe(true));
            expect(banner(wrapper).text()).toContain(
                "This note was changed elsewhere.",
            );
            expect(
                wrapper.get<HTMLInputElement>(".title-editor").element.value,
            ).toBe("Mine");
            expect(wrapper.emitted("reload")).toBeUndefined();

            await button(wrapper, "Keep mine").trigger("click");
            expect(banner(wrapper).exists()).toBe(false);
            expect(
                wrapper.get<HTMLInputElement>(".title-editor").element.value,
            ).toBe("Mine");

            pushUpdate({ title: "Again" });
            await vi.waitFor(() => expect(banner(wrapper).exists()).toBe(true));
            await button(wrapper, "Reload").trigger("click");
            expect(wrapper.emitted("reload")).toHaveLength(1);
            wrapper.unmount();
        });

        it("do not count this tab's own saves", async () => {
            const wrapper = mountEditor();
            await vi.waitFor(() => expect(topBarButton("Save")).not.toBeNull());
            await editTitle(wrapper);

            topBarButton("Save")!.click();
            await vi.waitFor(() =>
                expect(
                    mockControl.state.notes.find((n) => n.id === 1)!.title,
                ).toBe("Mine"),
            );
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(banner(wrapper).exists()).toBe(false);
            expect(wrapper.emitted("reload")).toBeUndefined();
            wrapper.unmount();
        });
    });
});
