import { AstNode } from "$frontend/markdown.ts";
import { renderChildren } from "$islands/viewer/renderer.tsx";

interface LinkProps {
    node: Extract<AstNode, { type: "link" }>;
}

export default function Link({ node }: LinkProps) {
    return (
        <a href={node.data.url} title={node.data.title} target="_blank">
            {renderChildren(node)}
        </a>
    );
}
