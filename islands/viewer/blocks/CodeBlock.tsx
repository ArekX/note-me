import { useEffect, useRef } from "preact/hooks";
import { highlightJs } from "$frontend/deps.ts";
import { AstNode } from "$frontend/markdown.ts";
import { renderChildren } from "$islands/viewer/renderer.tsx";

interface CodeBlockProps {
    node: Extract<AstNode, { type: "codeBlock" }>;
}

export const CodeBlock = ({ node }: CodeBlockProps) => {
    const viewerRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!viewerRef.current) {
            return;
        }

        const code = viewerRef.current.textContent ?? "";

        viewerRef.current.innerHTML = highlightJs.highlight(
            code,
            { language: node.data.language },
        ).value;
    }, [viewerRef]);

    return (
        <pre
            ref={viewerRef}
            class={`lang-${node.data.language}`}
        >{renderChildren(node)}</pre>
    );
};
