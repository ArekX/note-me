import { AstNode } from "$frontend/markdown.ts";

interface ImageProps {
    node: Extract<AstNode, { type: "image" }>;
}

export default function Image({ node }: ImageProps) {
    return (
        <img
            src={node.url}
            alt={node.title}
        />
    );
}
