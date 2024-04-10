import { AstNode } from "$frontend/markdown.ts";

interface ImageProps {
    node: Extract<AstNode, { type: "image" }>;
}

export const Image = ({ node }: ImageProps) => {
    return (
        <img
            src={node.url}
            alt={node.title}
        />
    );
};
