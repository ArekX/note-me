import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

export default function Root({ node, originalText }: BlockProps<"root">) {
    return <>{renderChildren(node, originalText)}</>;
}
