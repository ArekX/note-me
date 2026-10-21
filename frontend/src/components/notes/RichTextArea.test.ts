import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import type { Editor } from "@tiptap/core";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import InsertItemDialog from "./InsertItemDialog.vue";
import RichTextArea from "./RichTextArea.vue";

vi.mock("mermaid", () => ({
    default: {
        initialize: vi.fn(),
        render: vi.fn(async () => ({ svg: "<svg></svg>" })),
    },
}));

const mountArea = async (initialText: string) => {
    const wrapper = mount(RichTextArea, {
        attachTo: document.body,
        props: { initialText, isSaving: false },
    });
    await flushPromises();
    return wrapper;
};

// Tiptap keeps the editor on its root element.
const editorOf = (wrapper: VueWrapper) =>
    (wrapper.get(".ProseMirror").element as HTMLElement & { editor: Editor })
        .editor;

const lastChange = (wrapper: VueWrapper) =>
    (wrapper.emitted("change") as string[][] | undefined)?.at(-1)?.[0];

describe("RichTextArea", () => {
    beforeEach(async () => {
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        // jsdom has no layout; ProseMirror measures ranges to scroll.
        Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
        Range.prototype.getBoundingClientRect = () => new DOMRect();
        document.elementFromPoint = () => null;
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("formats with the toolbar tools and reports markdown", async () => {
        const wrapper = await mountArea("# Title\n\nHello");
        expect(wrapper.get(".ProseMirror h1").text()).toBe("Title");

        editorOf(wrapper).commands.setTextSelection({ from: 8, to: 13 });
        (wrapper.vm as unknown as { runTool: (tool: string) => void }).runTool(
            "bold",
        );
        expect(lastChange(wrapper)).toBe("# Title\n\n**Hello**");
        wrapper.unmount();
    });

    it("shows extensions as labelled blocks", async () => {
        const wrapper = await mountArea(
            "{:note-list|1} {:note-link|1} {:table-of-contents}",
        );
        const note = mockControl.state.notes.find((n) => n.id === 1)!;
        await vi.waitFor(() =>
            expect(
                wrapper
                    .findAll(".rich-extension-chip")
                    .map((chip) => chip.text()),
            ).toEqual([
                "Note list: Work",
                `Note link: ${note.title}`,
                "Table of contents",
            ]),
        );
        wrapper.unmount();
    });

    it("shows audio as a card with the player", async () => {
        const wrapper = await mountArea("{:audio|/file/abc}");
        const block = wrapper.get(".rich-extension-media");
        expect(block.classes()).toContain("glass-card");
        expect(block.get("strong").text()).toBe("Audio");
        expect(block.text()).not.toContain("/file/abc");
        expect(block.get("audio").attributes("src")).toBe("/file/abc");
        wrapper.unmount();
    });

    it("picks the language of a code block from a list", async () => {
        const wrapper = await mountArea("```js\nlet a;\n```");
        const select = wrapper.get<HTMLSelectElement>(
            '.rich-code-block select[aria-label="Code language"]',
        );
        expect(select.element.value).toBe("javascript");
        expect(wrapper.emitted("change")).toBeUndefined();

        await select.setValue("python");
        expect(lastChange(wrapper)).toBe("```python\nlet a;\n```");
        wrapper.unmount();
    });

    it("highlights code like the viewer does", async () => {
        const wrapper = await mountArea(
            "```js\nlet a = 1;\n```\n\n```\nlet b = 2;\n```",
        );
        const [js, plain] = wrapper.findAll(".rich-code-block pre");
        expect(js!.find(".hljs-keyword").text()).toBe("let");
        expect(plain!.find("[class^='hljs-']").exists()).toBe(false);
        wrapper.unmount();
    });

    it("inserts a code block from the toolbar", async () => {
        const wrapper = await mountArea("let a;");
        editorOf(wrapper).commands.setTextSelection(1);
        (wrapper.vm as unknown as { runTool: (tool: string) => void }).runTool(
            "code-block",
        );
        expect(lastChange(wrapper)).toBe("```\nlet a;\n```");
        wrapper.unmount();
    });

    it("selects a code block from the card around the code", async () => {
        const wrapper = await mountArea("Before\n\n```js\nlet a;\n```");
        expect(wrapper.get(".rich-code-block").classes()).not.toContain(
            "is-selected",
        );
        await wrapper.get(".rich-code-block pre").trigger("mousedown");
        expect(wrapper.get(".rich-code-block").classes()).not.toContain(
            "is-selected",
        );

        await wrapper.get(".rich-code-header").trigger("mousedown");
        expect(wrapper.get(".rich-code-block").classes()).toContain(
            "is-selected",
        );

        const { view } = editorOf(wrapper);
        const copied = view.someProp("clipboardTextSerializer", (serialize) =>
            serialize(view.state.selection.content(), view),
        );
        expect(copied).toBe("```js\nlet a;\n```");

        view.someProp("handleKeyDown", (handler) =>
            handler(view, new KeyboardEvent("keydown", { key: "Backspace" })),
        );
        expect(lastChange(wrapper)).toBe("Before");
        wrapper.unmount();
    });

    it("shows a mermaid block as its diagram first", async () => {
        const wrapper = await mountArea("```mermaid\ngraph TD; A-->B\n```");
        const block = () => wrapper.get(".rich-code-block");
        const viewButton = (name: string) =>
            block().get(`[aria-label="Diagram view"] button[title="${name}"]`);
        expect(viewButton("Diagram").attributes("aria-pressed")).toBe("true");
        expect(block().get("pre").classes()).toContain("hidden");
        expect(block().find(".mermaid-diagram").exists()).toBe(true);

        await viewButton("Code").trigger("click");
        expect(block().get("pre").classes()).not.toContain("hidden");
        expect(block().find(".mermaid-diagram").exists()).toBe(false);

        await viewButton("Split").trigger("click");
        expect(block().get("pre").classes()).not.toContain("hidden");
        expect(block().find(".mermaid-diagram").exists()).toBe(true);
        expect(wrapper.emitted("change")).toBeUndefined();
        wrapper.unmount();
    });

    it("keeps the code of an empty mermaid block in view", async () => {
        const wrapper = await mountArea("```mermaid\n```\n\n```js\nx\n```");
        const [mermaid, js] = wrapper.findAll(".rich-code-block");
        expect(
            mermaid!.get('button[title="Split"]').attributes("aria-pressed"),
        ).toBe("true");
        expect(js!.find('[aria-label="Diagram view"]').exists()).toBe(false);
        wrapper.unmount();
    });

    it("keeps a code language it does not know", async () => {
        const wrapper = await mountArea("```made-up\nx\n```");
        const select = wrapper.get<HTMLSelectElement>(
            ".rich-code-block select",
        );
        expect(select.element.value).toBe("made-up");
        expect(select.findAll("option")[0]!.text()).toBe("Plain text");
        wrapper.unmount();
    });

    it("aligns a selected image through the image extension", async () => {
        const wrapper = await mountArea("![A cat](/file/x)");
        expect(wrapper.find(".rich-align-toolbar").exists()).toBe(false);

        editorOf(wrapper).commands.setNodeSelection(1);
        await flushPromises();
        const toolbar = wrapper.get(".rich-align-toolbar");
        expect(toolbar.get('[aria-pressed="true"]').attributes("title")).toBe(
            "Align left",
        );

        await toolbar.get('[title="Align center"]').trigger("click");
        expect(lastChange(wrapper)).toBe("{:image|/file/x|center|A cat}");
        expect(wrapper.get(".rich-extension-image").classes()).toContain(
            "align-center",
        );

        await wrapper
            .get('.rich-align-toolbar [title="Align left"]')
            .trigger("click");
        expect(lastChange(wrapper)).toBe("![A cat](/file/x)");
        wrapper.unmount();
    });

    it("encodes an image address that would break the extension", async () => {
        const wrapper = await mountArea("");
        const editor = editorOf(wrapper);
        editor.commands.insertContent({
            type: "image",
            attrs: { src: "https://e.com/a|b}.png", alt: "A | B" },
        });
        editor.commands.setNodeSelection(1);
        await flushPromises();

        await wrapper
            .get('.rich-align-toolbar [title="Align center"]')
            .trigger("click");
        expect(lastChange(wrapper)).toBe(
            "{:image|https://e.com/a%7Cb%7D.png|center|A B}",
        );
        expect(wrapper.get(".rich-extension-image img").attributes("src")).toBe(
            "https://e.com/a%7Cb%7D.png",
        );

        await wrapper
            .get('.rich-align-toolbar [title="Align right"]')
            .trigger("click");
        expect(lastChange(wrapper)).toBe(
            "{:image|https://e.com/a%7Cb%7D.png|right|A B}",
        );

        await wrapper
            .get('.rich-align-toolbar [title="Align left"]')
            .trigger("click");
        expect(lastChange(wrapper)).toBe("![A B](https://e.com/a%7Cb%7D.png)");
        wrapper.unmount();
    });

    it("aligns a selected audio player with a parameter", async () => {
        const wrapper = await mountArea("{:audio|/file/a}");
        editorOf(wrapper).commands.setNodeSelection(1);
        await flushPromises();
        await wrapper
            .get('.rich-align-toolbar [title="Align right"]')
            .trigger("click");
        expect(lastChange(wrapper)).toBe("{:audio|/file/a|right}");
        expect(wrapper.get(".rich-extension-media").classes()).toContain(
            "align-right",
        );
        wrapper.unmount();
    });

    it("shows no alignment for a selection of several items", async () => {
        const wrapper = await mountArea("![a](/file/a) ![b](/file/b)");
        editorOf(wrapper).commands.setTextSelection({ from: 1, to: 4 });
        await flushPromises();
        expect(wrapper.find(".rich-align-toolbar").exists()).toBe(false);
        wrapper.unmount();
    });

    it("parses inserted markdown at the cursor", async () => {
        const wrapper = await mountArea("Hello world");
        editorOf(wrapper).commands.setTextSelection(7);
        (
            wrapper.vm as unknown as { openInsert: (id: string) => void }
        ).openInsert("note-link");
        await flushPromises();

        wrapper
            .getComponent(InsertItemDialog)
            .vm.$emit("insert", "{:note-link|1}");
        await flushPromises();
        expect(lastChange(wrapper)).toBe("Hello {:note-link|1}world");
        expect(wrapper.find(".rich-extension-chip").exists()).toBe(true);
        wrapper.unmount();
    });

    it("reopens the insert dialog of an extension to change it", async () => {
        const wrapper = await mountArea("List: {:note-list|1}");
        await wrapper.get(".rich-extension-chip").trigger("click");

        const dialog = wrapper.getComponent(InsertItemDialog);
        expect(dialog.props()).toMatchObject({
            itemId: "note-list",
            initialData: { groupId: 1 },
        });
        dialog.vm.$emit("insert", "{:note-list|2}");
        await flushPromises();
        expect(lastChange(wrapper)).toBe("List: {:note-list|2}");
        wrapper.unmount();
    });

    it("pastes plain text as markdown", async () => {
        const wrapper = await mountArea("");
        const { view } = editorOf(wrapper);
        const clipboard: Record<string, string> = {
            "text/plain": "**bold** and [a](/b)",
        };
        const event = {
            clipboardData: {
                files: [],
                getData: (type: string) => clipboard[type] ?? "",
            },
            preventDefault: () => {},
        } as unknown as ClipboardEvent;
        view.someProp("handlePaste", (handler) =>
            handler(view, event, view.state.doc.slice(0, 0)),
        );
        expect(lastChange(wrapper)).toBe("**bold** and [a](/b)");
        wrapper.unmount();
    });
});
