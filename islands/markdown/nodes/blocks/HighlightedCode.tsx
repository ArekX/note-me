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

        const result = language && highlightJs.getLanguage(language)
            ? highlightJs.highlight(code, { language })
            : highlightJs.highlightAuto(code);

        viewerRef.current.innerHTML = result.value;
    }, [viewerRef]);

    return (
        <pre
            ref={viewerRef}
            class={`lang-${language} overflow-auto`}
        >{children}</pre>
    );
}
