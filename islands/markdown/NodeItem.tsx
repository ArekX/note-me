import { AstNode } from "$frontend/markdown.ts";
import Icon from "$components/Icon.tsx";
import Link from "$islands/markdown/nodes/Link.tsx";
import Heading from "$islands/markdown/nodes/Heading.tsx";
import Extension from "$islands/markdown/nodes/Extension.tsx";
import CodeBlock from "$islands/markdown/nodes/CodeBlock.tsx";
import { JSX } from "preact";

export interface NodeProps<T extends AstNode["type"]> {
    node: Extract<AstNode, { type: T }>;
    originalText?: string;
    children?: JSX.Element[] | null;
}

interface NodeItemProps {
    node: AstNode;
    originalText: string;
}

export default function NodeItem({
    node,
    originalText,
}: NodeItemProps) {
    const items = "children" in node
        ? node.children.map((c, index) => (
            <NodeItem
                key={index}
                node={c}
                originalText={originalText}
            />
        ))
        : null;

    switch (node.type) {
        case "text":
            return <span>{node.content}</span>;
        case "paragraph":
            return (
                <p>
                    {items}
                </p>
            );
        case "list": {
            if (node.data.type === "ordered") {
                return <ol>{items}</ol>;
            }

            return (
                <ul>
                    {items}
                </ul>
            );
        }
        case "listItem":
            return (
                <li>
                    {items}
                </li>
            );
        case "softBreak":
            return <span>&nbsp;</span>;
        case "hardBreak":
            return <p>&nbsp;</p>;
        case "blockQuote":
            return <blockquote>{items}</blockquote>;
        case "taskListMarker":
            return (
                <Icon name={node.checked ? "checkbox-checked" : "checkbox"} />
            );
        case "rule":
            return <hr />;
        case "image":
            return <img src={node.url} class="inline-block" alt={node.title} />;
        case "emphasis":
            return <i>{items}</i>;
        case "strong":
            return <strong>{items}</strong>;
        case "strikethrough":
            return <s>{items}</s>;
        case "link":
            return <Link node={node}>{items}</Link>;
        case "code":
            return <code>{node.content}</code>;
        case "heading":
            return (
                <Heading node={node}>
                    {items}
                </Heading>
            );
        case "table":
            return <table>{items}</table>;
        case "tableCell":
            return <td>{items}</td>;
        case "tableHead":
        case "tableRow":
            return <tr>{items}</tr>;
        case "footnoteDefinition":
            return <sup>{items}</sup>;
        case "footnoteReference":
            return <sup>{items}</sup>;
        case "extension":
            return <Extension node={node} originalText={originalText} />;
        case "codeBlock":
            return (
                <CodeBlock node={node}>
                    {items}
                </CodeBlock>
            );
    }

    return (
        <div class="text-red-700 p-2 m-2 border-solid border-red-600 border-2">
            Unknown node: {node.type}
        </div>
    );
}
