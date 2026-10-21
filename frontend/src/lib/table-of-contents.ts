import { nodeText, parseMarkdown, type AstNode } from "./markdown";

export interface TocItem {
    level: number;
    text: string;
    children: TocItem[];
}

const headings = (nodes: AstNode[]): AstNode[] =>
    nodes.flatMap((node) =>
        node.type === "heading"
            ? [node]
            : "children" in node
              ? headings(node.children)
              : [],
    );

export const parseTableOfContents = (markdownText: string): TocItem[] => {
    const root: TocItem = { level: 0, text: "root", children: [] };
    const stack: TocItem[] = [root];

    for (const heading of headings(parseMarkdown(markdownText).children)) {
        if (heading.type !== "heading") {
            continue;
        }

        const item: TocItem = {
            level: heading.data.level,
            text: nodeText(heading),
            children: [],
        };

        while (
            stack.length > 1 &&
            stack[stack.length - 1]!.level >= item.level
        ) {
            stack.pop();
        }
        stack[stack.length - 1]!.children.push(item);
        stack.push(item);
    }

    return root.children;
};
