import { AstNode } from "$frontend/markdown.ts";
import { createElement } from "preact";
import { renderChildren } from "$islands/viewer/renderer.tsx";

type ChildNodeTypes =
    | "paragraph"
    | "listItem"
    | "tableHead"
    | "tableRow"
    | "tableCell"
    | "emphasis"
    | "strong"
    | "strikethrough"
    | "table";

interface ChildrenNodeProps {
    node: Extract<AstNode, { type: ChildNodeTypes }>;
}

const nodeElementMap: Record<ChildNodeTypes, string> = {
    strong: "strong",
    table: "table",
    strikethrough: "s",
    emphasis: "i",
    listItem: "li",
    paragraph: "p",
    tableHead: "th",
    tableRow: "tr",
    tableCell: "td",
};

export const ChildrenNode = ({ node }: ChildrenNodeProps) => {
    return createElement(
        nodeElementMap[node.type],
        {},
        renderChildren(node),
    );
};
