import { AstNode } from "$frontend/markdown.ts";

interface CodeProps {
    node: Extract<AstNode, { type: "code" }>;
}

export const Code = ({ node }: CodeProps) => {
    return <span>{node.content}</span>;
};
