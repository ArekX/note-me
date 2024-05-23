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

export type RendererFn<T> = (
    data: { node: Extract<AstNode, { type: T }> },
) => JSX.Element;

export type RendererMap = {
    [K in AstNode["type"]]: RendererFn<K>;
};

export const blockMap: RendererMap = {
    list: (data) => <List node={data.node} />,
    link: (data) => <Link node={data.node} />,
    image: (data) => <Image node={data.node} />,
    footnoteDefinition: (data) => <Footnote node={data.node} />,
    codeBlock: (data) => <CodeBlock node={data.node} />,
    blockQuote: (data) => <Blockquote node={data.node} />,
    heading: (data) => <Heading node={data.node} />,
    paragraph: (data) => <ChildrenNode node={data.node} />,
    listItem: (data) => <ChildrenNode node={data.node} />,
    tableHead: (data) => <ChildrenNode node={data.node} />,
    tableRow: (data) => <ChildrenNode node={data.node} />,
    tableCell: (data) => <ChildrenNode node={data.node} />,
    emphasis: (data) => <ChildrenNode node={data.node} />,
    strong: (data) => <ChildrenNode node={data.node} />,
    strikethrough: (data) => <ChildrenNode node={data.node} />,
    table: (data) => <ChildrenNode node={data.node} />,
    text: (data) => <Text node={data.node} />,
    code: (data) => <Code node={data.node} />,
    footnoteReference: (data) => <Footnote node={data.node} />,
    softBreak: () => <Break />,
    hardBreak: () => <Break />,
    rule: () => <HorizontalLine />,
    taskListMarker: (data) => <Checkbox node={data.node} />,
    extension: (data) => <Extension node={data.node} />,
    root: (data) => <Root node={data.node} />,
};

export const renderChildren = (node: AstContainerNode) =>
    node.children.map(renderComponent);

const renderComponent = (
    node: AstNode,
): JSX.Element => {
    const render = blockMap[node.type] as RendererFunctions;

    if (!render) {
        throw new Error("Unknown AST node type: " + node.type);
    }

    return render({ node });
};

export const renderMarkdown = (text: string) =>
    renderComponent(parseMarkdown(text));
