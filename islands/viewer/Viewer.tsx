import { parseMarkdown } from "$frontend/markdown.ts";
import { useMemo } from "preact/hooks";
import { CodeBlock } from "./blocks/CodeBlock.tsx";
import { AstTokenWithChildren } from "$frontend/markdown.ts";

export type ViewerProps = {
    text: string;
};

export default function Viewer({ text = "" }: ViewerProps) {
    console.log(parseMarkdown(text));

    const components = useMemo(() => {
        const root = parseMarkdown(text);
        // Convert the AST to a JSX tree and return it;

        const result = [];

        for (const token of root.children) {
            if (token.type === "codeBlock") {
                const { children, language } = token as AstTokenWithChildren & {
                    language: string;
                }; // TODO: Add proper type checking
                result.push(
                    <CodeBlock
                        code={children.map((t) => t.content).join("\n")}
                        language={language}
                    />,
                );
            } else {
                result.push(<div>{token.content}</div>);
            }
        }

        return result;
    }, [text]);

    return (
        <div class="markdown-viewer">
            {components}
        </div>
    );
}
