import { AstNode } from "$frontend/markdown.ts";
import { renderChildren } from "$islands/viewer/renderer.tsx";

interface RootProps {
    node: Extract<AstNode, { type: "root" }>;
}

export const Root = ({ node }: RootProps) => {
    return <>{renderChildren(node)}</>;
};
