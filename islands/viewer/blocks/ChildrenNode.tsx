import { createElement } from "preact";
import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

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

const nodeElementMap: Record<ChildNodeTypes, string> = {
    strong: "strong",
    table: "table",
    strikethrough: "s",
    emphasis: "i",
    listItem: "li",
    paragraph: "p",
    tableHead: "tr",
    tableRow: "tr",
    tableCell: "td",
};

export default function ChildrenNode(
    { node, originalText }: BlockProps<ChildNodeTypes>,
) {
    return createElement(
        nodeElementMap[node.type],
        { className: `node-${node.type}` },
        renderChildren(node, originalText),
    );
}
