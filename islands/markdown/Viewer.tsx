import { parseMarkdown } from "$frontend/markdown.ts";
import NodeItem from "$islands/markdown/NodeItem.tsx";

export type ViewerProps = {
    text: string;
};

export default function Viewer({ text = "" }: ViewerProps) {
    const rootNode = parseMarkdown(text);

    return (
        <div class="markdown-viewer">
            {rootNode.children.map((node, index) => (
                <NodeItem key={index} node={node} originalText={text} />
            ))}
        </div>
    );
}
