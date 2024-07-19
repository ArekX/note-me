import TableOfContents from "$islands/notes/blocks/TableOfContents.tsx";
import { NodeProps } from "$islands/markdown/NodeItem.tsx";
import Picker, { PickerMap } from "$components/Picker.tsx";
import NoteList from "$islands/notes/blocks/NoteList.tsx";
import { ComponentChildren } from "preact";
import { MarkdownOptions } from "$islands/markdown/Viewer.tsx";
import NoteLink from "$islands/notes/blocks/NoteLink.tsx";

const TableOfContentsExtension = (props: { text: string }) => {
    return <TableOfContents text={props.text} />;
};

type ExtensionTypes =
    | "table-of-contents"
    | "note-list"
    | "note-link"
    | "over-limit";

interface ExtensionProps {
    noteText: string;
    params: string[];
    options: MarkdownOptions;
}

const ExtensionError = (props: { children: ComponentChildren }) => {
    return (
        <div class="p-1 border-solid border-2 border-red-500">
            {props.children}
        </div>
    );
};

const extensionMap: PickerMap<ExtensionTypes, ExtensionProps> = {
    "table-of-contents": ({ noteText }) => (
        <TableOfContentsExtension text={noteText} />
    ),
    "note-list": ({ params, options }) => (
        options.isSharing
            ? (
                <ExtensionError>
                    Note List is unavailble in share view.
                </ExtensionError>
            )
            : (
                <NoteList
                    groupId={parseInt(params[0])}
                    allowLinks={!options.isSharing}
                />
            )
    ),
    "note-link": ({ params, options }) => (
        options.isSharing
            ? (
                <ExtensionError>
                    Note Link is unavailble in share view.
                </ExtensionError>
            )
            : (
                <NoteLink
                    noteId={parseInt(params[0])}
                />
            )
    ),
    "over-limit": ({ params }) => (
        <ExtensionError>
            Could not render "{params[0]}" extension #{params[1]}. Too many
            extensions of this type in this text. Maximum allowed is{" "}
            {params[2]}.
        </ExtensionError>
    ),
};

export interface ExtensionNodeProps extends NodeProps<"extension"> {
    options: MarkdownOptions;
}

export default function Extension(
    { node, originalText, options }: ExtensionNodeProps,
) {
    return (
        <Picker<ExtensionTypes, ExtensionProps>
            selector={node.extension as ExtensionTypes}
            propsGetter={() => ({
                noteText: originalText ?? "",
                params: node.params,
                options,
            })}
            map={extensionMap}
            defaultComponent={() => (
                <ExtensionError>
                    Unknown extension:{" "}
                    "{node.extension}", parameters: ({node.params.join(", ")})
                </ExtensionError>
            )}
        />
    );
}
