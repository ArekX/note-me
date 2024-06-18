import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";
import { NodeProps } from "$islands/markdown/NodeItem.tsx";

const TableOfContentsExtension = (props: { text: string }) => {
    return <TableOfContents text={props.text} />;
};

const extensionMap = {
    "table-of-contents": TableOfContentsExtension,
};

export default function Extension(
    { node, originalText }: NodeProps<"extension">,
) {
    const ExtensionComponent =
        extensionMap[node.extension as keyof typeof extensionMap];

    if (ExtensionComponent) {
        return <ExtensionComponent text={originalText} />;
    }

    return (
        <span class="p-1 border-solid border-2">
            Unknown extension: {node.extension}({node.params.join(", ")})
        </span>
    );
}
