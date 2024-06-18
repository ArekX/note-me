import { useEffect, useRef } from "preact/hooks";
import { highlightJs } from "$frontend/deps.ts";
import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";

export default function CodeBlock(
    { node, originalText }: BlockProps<"codeBlock">,
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
            class={`lang-${node.data.language}`}
        >{renderChildren(node, originalText)}</pre>
    );
}
