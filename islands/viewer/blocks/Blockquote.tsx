import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

export default function Blockquote(
    { node, originalText }: BlockProps<"blockQuote">,
) {
    return <blockquote>{renderChildren(node, originalText)}</blockquote>;
}
