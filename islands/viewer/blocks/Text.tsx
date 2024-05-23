import { AstNode } from "$frontend/markdown.ts";

interface TextProps {
    node: Extract<AstNode, { type: "text" }>;
}

export default function Text({ node }: TextProps) {
    return <span>{node.content}</span>;
}
