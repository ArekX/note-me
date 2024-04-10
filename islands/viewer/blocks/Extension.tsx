import { AstNode } from "$frontend/markdown.ts";

interface ExtensionProps {
    node: Extract<AstNode, { type: "extension" }>;
}

export const Extension = ({ node }: ExtensionProps) => {
    return <div>Extension</div>;
};
