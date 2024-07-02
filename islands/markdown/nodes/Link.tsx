import { NodeProps } from "$islands/markdown/NodeItem.tsx";

export default function Link(
    { node, children }: NodeProps<"link">,
) {
    const url = node.data.url.trim();
    const target = !url.startsWith("#") ? "_blank" : "_self";
    return (
        <a
            class="inline-block"
            href={url}
            title={node.data.title}
            target={target}
        >
            {children}
        </a>
    );
}
