import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

export default function List({ node, originalText }: BlockProps<"list">) {
    if (node.data.type === "ordered") {
        return <ol>{renderChildren(node, originalText)}</ol>;
    }
    return <ul>{renderChildren(node, originalText)}</ul>;
}
