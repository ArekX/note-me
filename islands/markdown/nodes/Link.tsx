import { NodeProps } from "$islands/markdown/NodeItem.tsx";

const SAFE_URL = /^(https?:|mailto:|tel:|ftp:|\/|#|\?|\.{1,2}\/)/i;

const sanitizeUrl = (raw: string): string => {
    const url = raw.trim();
    return SAFE_URL.test(url) ? url : "#";
};

export default function Link(
    { node, children }: NodeProps<"link">,
) {
    const url = sanitizeUrl(node.data.url);
    const target = !url.startsWith("#") ? "_blank" : "_self";
    return (
        <a
            class="inline-block"
            href={url}
            title={node.data.title}
            target={target}
            rel="noopener noreferrer"
        >
            {children}
        </a>
    );
}
