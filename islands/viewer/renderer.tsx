import {
    AstContainerNode,
    AstNode,
    parseMarkdown,
} from "$frontend/markdown.ts";
import { JSX } from "preact/jsx-runtime";

import Text from "./blocks/Text.tsx";
import Root from "./blocks/Root.tsx";
import List from "./blocks/List.tsx";
import Link from "./blocks/Link.tsx";
import Image from "./blocks/Image.tsx";
import Heading from "./blocks/Heading.tsx";
import Checkbox from "./blocks/Checkbox.tsx";
import Blockquote from "./blocks/Blockquote.tsx";
import Footnote from "./blocks/Footnote.tsx";
import ChildrenNode from "./blocks/ChildrenNode.tsx";

import Code from "./blocks/Code.tsx";
import Break from "./blocks/Break.tsx";
import HorizontalLine from "./blocks/HorizontalLine.tsx";
import CodeBlock from "./blocks/CodeBlock.tsx";
import Extension from "./blocks/Extension.tsx";

type RendererFunctions = RendererFn<AstNode["type"]>;

export type RendererFn<T extends AstNode["type"]> = (
    data: BlockProps<T>,
) => JSX.Element;

export type RendererMap = {
    [K in AstNode["type"]]: RendererFn<K>;
};

export interface BlockProps<T extends AstNode["type"]> {
    node: Extract<AstNode, { type: T }>;
    originalText: string;
}

export const blockMap: RendererMap = {
    list: (data) => <List {...data} />,
    link: (data) => <Link {...data} />,
    image: (data) => <Image {...data} />,
    footnoteDefinition: (data) => <Footnote {...data} />,
    codeBlock: (data) => <CodeBlock {...data} />,
    blockQuote: (data) => <Blockquote {...data} />,
    heading: (data) => <Heading {...data} />,
    paragraph: (data) => <ChildrenNode {...data} />,
    listItem: (data) => <ChildrenNode {...data} />,
    tableHead: (data) => <ChildrenNode {...data} />,
    tableRow: (data) => <ChildrenNode {...data} />,
    tableCell: (data) => <ChildrenNode {...data} />,
    emphasis: (data) => <ChildrenNode {...data} />,
    strong: (data) => <ChildrenNode {...data} />,
    strikethrough: (data) => <ChildrenNode {...data} />,
    table: (data) => <ChildrenNode {...data} />,
    text: (data) => <Text {...data} />,
    code: (data) => <Code {...data} />,
    footnoteReference: (data) => <Footnote {...data} />,
    softBreak: () => <Break />,
    hardBreak: () => <Break />,
    rule: () => <HorizontalLine />,
    taskListMarker: (data) => <Checkbox {...data} />,
    extension: (data) => <Extension {...data} />,
    root: (data) => <Root {...data} />,
};

export const renderChildren = (node: AstContainerNode, originalText: string) =>
    node.children.map((n) => renderComponent(n, originalText));

const renderComponent = (
    node: AstNode,
    originalText: string,
): JSX.Element => {
    const render = blockMap[node.type] as RendererFunctions;

    if (!render) {
        throw new Error("Unknown AST node type: " + node.type);
    }

    return render({ node, originalText });
};

export const renderMarkdown = (text: string) =>
    renderComponent(parseMarkdown(text), text);
