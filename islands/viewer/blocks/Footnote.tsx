import { BlockProps } from "$islands/viewer/renderer.tsx";

export default function Footnote(
    { node }: BlockProps<"footnoteDefinition" | "footnoteReference">,
) {
    return <div class="footnote-definition">{node.type}</div>;
}
