import { parseMarkdown } from "$frontend/markdown.ts";
import NodeItem from "$islands/markdown/NodeItem.tsx";

export interface MarkdownOptions {
    isSharing?: boolean;
}

export type ViewerProps = {
    text: string;
    options?: MarkdownOptions;
};

export default function Viewer({ text = "", options = {} }: ViewerProps) {
    const rootNode = parseMarkdown(text);

    return (
        <div class="markdown-viewer">
            {rootNode.children.map((node, index) => (
                <NodeItem
                    key={index}
                    node={node}
                    originalText={text}
                    options={options}
                />
            ))}
        </div>
    );
}
