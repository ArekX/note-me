import { BlockProps } from "$islands/viewer/renderer.tsx";
import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";

const TableOfContentsExtension = (props: { text: string }) => {
    return <TableOfContents text={props.text} />;
};

const extensionMap = {
    "table-of-contents": TableOfContentsExtension,
};

export default function Extension(
    { node, originalText }: BlockProps<"extension">,
) {
    const ExtensionComponent =
        extensionMap[node.extension as keyof typeof extensionMap];

    if (ExtensionComponent) {
        return <ExtensionComponent text={originalText} />;
    }

    return (
        <span class="p-1 border-solid border-2">
            Ext: {node.extension}({node.params.join(", ")})
        </span>
    );
}
