import { useEffect, useRef } from "preact/hooks";
import { highlightJs } from "$frontend/deps.ts";

interface CodeBlockProps {
    code: string;
    language: string;
}

export const CodeBlock = ({ code, language }: CodeBlockProps) => {
    const viewerRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (!viewerRef.current) {
            return;
        }

        viewerRef.current.innerHTML =
            highlightJs.highlight(code ?? "", { language }).value;
    }, [viewerRef]);

    return <pre ref={viewerRef} class={`lang-${language}`}>{code}</pre>;
};
