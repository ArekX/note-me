import { useEffect, useRef } from "preact/hooks";
import { highlightJs } from "$frontend/deps.ts";
import { ComponentChildren } from "preact";

export interface HighlightedCodeProps {
    language: string;
    children: ComponentChildren;
}

export default function HighlightedCode(
    { language, children }: HighlightedCodeProps,
) {
    const viewerRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!viewerRef.current) {
            return;
        }
        const code = viewerRef.current.textContent ?? "";

        viewerRef.current.innerHTML = highlightJs.highlight(
            code,
            { language: language },
        ).value;
    }, [viewerRef]);

    return (
        <pre
            ref={viewerRef}
            class={`lang-${language} overflow-auto`}
        >{children}</pre>
    );
}
