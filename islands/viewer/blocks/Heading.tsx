import { AstNode } from "$frontend/markdown.ts";
import { renderChildren } from "$islands/viewer/renderer.tsx";
import { createElement } from "preact";

interface HeadingProps {
    node: Extract<AstNode, { type: "heading" }>;
}

export default function Heading({ node }: HeadingProps) {
    return createElement(
        `h${Math.min(6, node.data.level)}`,
        {},
        renderChildren(node),
    );
}
