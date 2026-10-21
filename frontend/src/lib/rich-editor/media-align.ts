import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, type EditorState } from "@tiptap/pm/state";
import {
    alignOf,
    getAlignedImageMarkdown,
    getMediaMarkdown,
    type MediaAlign,
} from "@/lib/markdown-snippets";
import { parseExtensionSource } from "./extensions";

export interface AlignTarget {
    pos: number;
    node: PMNode;
    kind: "image" | "audio" | "video";
    url: string;
    alt: string;
    align: MediaAlign;
}

// Only a single selected image, audio or video can be aligned.
export const selectedAlignTarget = (state: EditorState): AlignTarget | null => {
    const { selection } = state;
    if (!(selection instanceof NodeSelection)) {
        return null;
    }
    const { node, from: pos } = selection;
    if (node.type.name === "image") {
        return {
            pos,
            node,
            kind: "image",
            url: (node.attrs.src as string | null) ?? "",
            alt: (node.attrs.alt as string | null) ?? "",
            align: "left",
        };
    }
    if (node.type.name !== "noteExtension") {
        return null;
    }
    const { name, params } = parseExtensionSource(node.attrs.source as string);
    if (name !== "image" && name !== "audio" && name !== "video") {
        return null;
    }
    return {
        pos,
        node,
        kind: name,
        url: params[0] ?? "",
        alt: name === "image" ? (params[2] ?? "") : "",
        align: alignOf(params[1]),
    };
};

// A left-aligned image goes back to plain markdown.
const alignedNode = (
    state: EditorState,
    target: AlignTarget,
    align: MediaAlign,
) => {
    const { schema } = state;
    const { marks } = target.node;
    if (target.kind === "image" && align === "left") {
        return schema.nodes.image!.create(
            { src: target.url, alt: target.alt || null },
            null,
            marks,
        );
    }
    const source =
        target.kind === "image"
            ? getAlignedImageMarkdown(target.url, target.alt, align)
            : getMediaMarkdown(target.kind, target.url, align);
    return schema.nodes.noteExtension!.create({ source }, null, marks);
};

export const setAlignment = (
    editor: Editor,
    target: AlignTarget,
    align: MediaAlign,
) => {
    if (target.align === align) {
        return;
    }
    const { state, view } = editor;
    const tr = state.tr.replaceWith(
        target.pos,
        target.pos + target.node.nodeSize,
        alignedNode(state, target, align),
    );
    tr.setSelection(NodeSelection.create(tr.doc, target.pos));
    view.dispatch(tr);
};
