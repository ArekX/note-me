import { AstNode, parseMarkdown } from "$frontend/markdown.ts";
import { JSX } from "preact/jsx-runtime";

export type RendererFn<T> = (
    data: { node: Extract<AstNode, { type: T }> },
) => JSX.Element;

const componentRenderer: {
    [K in Exclude<AstNode["type"], "root">]: RendererFn<K>;
} = {
    list: (data) => {
        throw new Error("Function not implemented.");
    },
    link: (data) => {
        throw new Error("Function not implemented.");
    },
    image: (data) => {
        throw new Error("Function not implemented.");
    },
    footnoteDefinition: (data) => {
        throw new Error("Function not implemented.");
    },
    codeBlock: (data) => {
        throw new Error("Function not implemented.");
    },
    paragraph: (data) => {
        throw new Error("Function not implemented.");
    },
    blockQuote: (data) => {
        throw new Error("Function not implemented.");
    },
    listItem: (data) => {
        throw new Error("Function not implemented.");
    },
    tableHead: (data) => {
        throw new Error("Function not implemented.");
    },
    tableRow: (data) => {
        throw new Error("Function not implemented.");
    },
    tableCell: (data) => {
        throw new Error("Function not implemented.");
    },
    emphasis: (data) => {
        throw new Error("Function not implemented.");
    },
    strong: (data) => {
        throw new Error("Function not implemented.");
    },
    strikethrough: (data) => {
        throw new Error("Function not implemented.");
    },
    heading: (data) => {
        throw new Error("Function not implemented.");
    },
    table: (data) => {
        throw new Error("Function not implemented.");
    },
    text: (data) => {
        throw new Error("Function not implemented.");
    },
    code: (data) => {
        throw new Error("Function not implemented.");
    },
    html: (data) => {
        throw new Error("Function not implemented.");
    },
    footnoteReference: (data) => {
        throw new Error("Function not implemented.");
    },
    softBreak: (data) => {
        throw new Error("Function not implemented.");
    },
    hardBreak: (data) => {
        throw new Error("Function not implemented.");
    },
    rule: (data) => {
        throw new Error("Function not implemented.");
    },
    taskListMarker: (data) => {
        throw new Error("Function not implemented.");
    },
};

export const createComponent = (node: AstNode): JSX.Element => {
    return <div>Oopop</div>;
};

export const markdownToComponents = (text: string) =>
    parseMarkdown(text).children.map(createComponent);
