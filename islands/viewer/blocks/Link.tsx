import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

export default function Link({ node, originalText }: BlockProps<"link">) {
    const url = node.data.url.trim();
    const target = !url.startsWith("#") ? "_blank" : "_self";
    return (
        <a href={url} title={node.data.title} target={target}>
            {renderChildren(node, originalText)}
        </a>
    );
}
