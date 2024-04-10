import { AstNode } from "$frontend/markdown.ts";
import { renderChildren } from "$islands/viewer/renderer.tsx";

interface ListProps {
    node: Extract<AstNode, { type: "list" }>;
}

export const List = ({ node }: ListProps) => {
    if (node.data.type === "ordered") {
        return <ol>{renderChildren(node)}</ol>;
    }
    return <ul>{renderChildren(node)}</ul>;
};
