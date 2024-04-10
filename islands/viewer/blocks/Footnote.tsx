import { AstNode } from "$frontend/markdown.ts";

interface FootnoteDefinitionProps {
    node: Extract<
        AstNode,
        { type: "footnoteDefinition" | "footnoteReference" }
    >;
}

export const Footnote = ({ node }: FootnoteDefinitionProps) => {
    return <div class="footnote-definition">{node.type}</div>;
};
