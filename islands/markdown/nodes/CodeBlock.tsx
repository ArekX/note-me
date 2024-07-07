import { useEffect, useRef } from "preact/hooks";
import { highlightJs } from "$frontend/deps.ts";
import { NodeProps } from "$islands/markdown/NodeItem.tsx";

export default function CodeBlock(
    { node, children }: NodeProps<"codeBlock">,
) {
    const viewerRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!viewerRef.current) {
            return;
        }

        if (!node.data.language) {
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
            class={`lang-${node.data.language} overflow-auto`}
        >{children}</pre>
    );
}
