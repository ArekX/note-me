import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";
import { NodeProps } from "$islands/markdown/NodeItem.tsx";
import Picker, { PickerMap } from "$components/Picker.tsx";

const TableOfContentsExtension = (props: { text: string }) => {
    return <TableOfContents text={props.text} />;
};

type ExtensionTypes = "table-of-contents";

interface ExtensionProps {
    noteText: string;
    params: string[];
}

const extensionMap: PickerMap<ExtensionTypes, ExtensionProps> = {
    "table-of-contents": ({ noteText }) => (
        <TableOfContentsExtension text={noteText} />
    ),
};

export default function Extension(
    { node, originalText }: NodeProps<"extension">,
) {
    return (
        <Picker<ExtensionTypes, ExtensionProps>
            selector={node.extension as ExtensionTypes}
            propsGetter={() => ({
                noteText: originalText ?? "",
                params: node.params,
            })}
            map={extensionMap}
            defaultComponent={() => (
                <span class="p-1 border-solid border-2">
                    Unknown extension:{" "}
                    {node.extension}({node.params.join(", ")})
                </span>
            )}
        />
    );
}
