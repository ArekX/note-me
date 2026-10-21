import type { Editor, JSONContent, Range } from "@tiptap/core";
import { headingLevelOf, type EditorTool } from "@/lib/editor-tools";
import type { ShortcutHandlers } from "./extensions";
import { markdownToDoc } from "./markdown-parse";

// A snippet of one paragraph goes in at the cursor instead of as a new block.
const snippetContent = (markdown: string): JSONContent[] => {
    const blocks = markdownToDoc(markdown).content ?? [];
    const [first] = blocks;
    return blocks.length === 1 && first?.type === "paragraph"
        ? (first.content ?? [])
        : blocks;
};

export const insertMarkdown = (
    editor: Editor,
    markdown: string,
    range?: Range,
) => {
    const content = snippetContent(markdown);
    const chain = editor.chain().focus();
    (range
        ? chain.insertContentAt(range, content)
        : chain.insertContent(content)
    ).run();
};

export const runRichTool = (
    editor: Editor,
    tool: EditorTool,
    dialogs: ShortcutHandlers,
) => {
    const chain = editor.chain().focus();
    const level = headingLevelOf(tool);
    if (level) {
        chain.toggleHeading({ level }).run();
        return;
    }
    switch (tool) {
        case "bold":
            chain.toggleBold().run();
            break;
        case "italic":
            chain.toggleItalic().run();
            break;
        case "code":
            chain.toggleCode().run();
            break;
        case "code-block":
            chain.toggleCodeBlock().run();
            break;
        case "bullet-list":
            chain.toggleBulletList().run();
            break;
        case "task-list":
            chain.toggleTaskList().run();
            break;
        case "link":
            dialogs.openLink();
            break;
        case "image":
            dialogs.openImage();
            break;
        case "table-of-contents":
            chain
                .insertContent({
                    type: "noteExtension",
                    attrs: { source: "{:table-of-contents}" },
                })
                .run();
            break;
    }
};

export interface LinkTarget {
    url: string;
    text: string;
}

// Selects the whole link around the cursor so editing it replaces all of it.
export const selectedLink = (editor: Editor): LinkTarget => {
    editor.chain().focus().extendMarkRange("link").run();
    const { from, to } = editor.state.selection;
    return {
        url: (editor.getAttributes("link").href as string | undefined) ?? "",
        text: editor.state.doc.textBetween(from, to, " "),
    };
};

export const applyLink = (editor: Editor, { url, text }: LinkTarget) => {
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) {
        chain.unsetLink().run();
        return;
    }
    const { from, to } = editor.state.selection;
    if (from !== to && editor.state.doc.textBetween(from, to, " ") === text) {
        chain.setLink({ href: url }).run();
        return;
    }
    chain
        .insertContent({
            type: "text",
            text: text || url,
            marks: [{ type: "link", attrs: { href: url } }],
        })
        .unsetMark("link")
        .run();
};

export const insertImage = (editor: Editor, { url, text }: LinkTarget) =>
    editor
        .chain()
        .focus()
        .insertContent({ type: "image", attrs: { src: url, alt: text } })
        .run();
