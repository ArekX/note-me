import { AstNode } from "$frontend/markdown.ts";

interface ExtensionProps {
    node: Extract<AstNode, { type: "extension" }>;
}

export const Extension = ({ node }: ExtensionProps) => {
    return (
        <span class="p-1 border-solid border-2">
            Ext: {node.extension}({node.params.join(", ")})
        </span>
    );
};
