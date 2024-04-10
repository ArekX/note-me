import { AstNode } from "$frontend/markdown.ts";

interface TextProps {
    node: Extract<AstNode, { type: "text" }>;
}

export const Text = ({ node }: TextProps) => {
    return <span>{node.content}</span>;
};
