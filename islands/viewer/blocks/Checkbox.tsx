import { AstNode } from "$frontend/markdown.ts";
import { Icon } from "$components/Icon.tsx";

interface CheckboxProps {
    node: Extract<AstNode, { type: "taskListMarker" }>;
}

export const Checkbox = ({ node }: CheckboxProps) => {
    return <Icon name={node.checked ? "checkbox-checked" : "checkbox"} />;
};