import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

export default function Link({ node, originalText }: BlockProps<"link">) {
    return (
        <a href={node.data.url} title={node.data.title} target="_blank">
            {renderChildren(node, originalText)}
        </a>
    );
}
