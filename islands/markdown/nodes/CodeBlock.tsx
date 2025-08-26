import { NodeProps } from "$islands/markdown/NodeItem.tsx";
import HighlightedCode from "$islands/markdown/nodes/blocks/HighlightedCode.tsx";
import MermaidDiagram from "$islands/markdown/nodes/blocks/MermaidDiagram.tsx";

export default function CodeBlock(
    { node, children }: NodeProps<"codeBlock">,
) {
    if (node.data.language === "mermaid") {
        return <MermaidDiagram>{children}</MermaidDiagram>;
    }

    return (
        <HighlightedCode language={node.data.language}>
            {children}
        </HighlightedCode>
    );
}
