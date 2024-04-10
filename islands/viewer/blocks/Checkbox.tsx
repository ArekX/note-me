import { AstNode } from "$frontend/markdown.ts";

interface CheckboxProps {
    node: Extract<AstNode, { type: "taskListMarker" }>;
}

export const Checkbox = ({ node }: CheckboxProps) => {
    return <input type="checkbox" checked={node.checked} disabled={true} />;
};
