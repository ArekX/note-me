import { AstNode } from "$frontend/markdown.ts";
import { renderChildren } from "$islands/viewer/renderer.tsx";

interface BlockquoteProps {
    node: Extract<AstNode, { type: "blockQuote" }>;
}

export const Blockquote = ({ node }: BlockquoteProps) => {
    return <blockquote>{renderChildren(node)}</blockquote>;
};
