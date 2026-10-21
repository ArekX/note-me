export const headingLevels = [1, 2, 3, 4, 5, 6] as const;

export type HeadingLevel = (typeof headingLevels)[number];

export type EditorTool =
    | "bold"
    | "italic"
    | "code"
    | "code-block"
    | `heading-${HeadingLevel}`
    | "bullet-list"
    | "task-list"
    | "link"
    | "image"
    | "table-of-contents";

export interface ToolButton {
    id: EditorTool;
    label: string;
    icon?: string;
    text?: string;
}

export const toolGroups: ToolButton[][] = [
    [
        { id: "bold", icon: "bold", label: "Bold" },
        { id: "italic", icon: "italic", label: "Italic" },
        { id: "code", icon: "code-alt", label: "Inline code" },
        { id: "code-block", icon: "code-block", label: "Code block" },
    ],
    headingLevels.map((level) => ({
        id: `heading-${level}` as const,
        text: `H${level}`,
        label: `Heading ${level}`,
    })),
    [
        { id: "bullet-list", icon: "list-ul", label: "List" },
        { id: "task-list", icon: "list-check", label: "Checklist" },
    ],
    [
        { id: "link", icon: "link", label: "Link" },
        { id: "image", icon: "image", label: "Image" },
    ],
];

export const tableOfContentsTool: ToolButton = {
    id: "table-of-contents",
    icon: "book-content",
    label: "Table of contents",
};

export const headingLevelOf = (tool: EditorTool): HeadingLevel | null =>
    tool.startsWith("heading-")
        ? (Number(tool.slice(8)) as HeadingLevel)
        : null;
