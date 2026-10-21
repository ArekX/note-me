import type { EditorView } from "@codemirror/view";
import { headingLevelOf, type EditorTool } from "@/lib/editor-tools";
import {
    insertCodeBlock,
    insertImageCommand,
    insertLinkCommand,
    insertText,
    setHeading,
    toggleBold,
    toggleInlineCode,
    toggleItalic,
    toggleLinePrefix,
} from "./markdown-commands";

const commands: Partial<Record<EditorTool, (view: EditorView) => boolean>> = {
    bold: toggleBold,
    italic: toggleItalic,
    code: toggleInlineCode,
    "code-block": insertCodeBlock,
    "bullet-list": (view) => toggleLinePrefix(view, "- "),
    "task-list": (view) => toggleLinePrefix(view, "- [ ] "),
    link: insertLinkCommand,
    image: insertImageCommand,
    "table-of-contents": (view) => insertText(view, "{:table-of-contents}"),
};

export const runSourceTool = (view: EditorView, tool: EditorTool) => {
    const level = headingLevelOf(tool);
    return level ? setHeading(view, level) : commands[tool]!(view);
};
