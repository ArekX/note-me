import { highlightJs, Marked } from "$frontend/deps.ts";
import { useEffect } from "preact/hooks";
import { createRef } from "preact";

export type ViewerProps = {
    markdownText: string;
};

export default function Viewer({ markdownText = "" }: ViewerProps) {
    const result = Marked.parse(markdownText, {
        sanitize: true,
        breaks: true,
        tables: true,
    });

    const viewerRef = createRef<HTMLDivElement>();

    useEffect(() => {
        if (viewerRef.current) {
            viewerRef.current.querySelectorAll("pre code").forEach((block) => {
                block.innerHTML =
                    highlightJs.highlight(block.textContent ?? "", {
                        language: block.classList[0].replace("lang-", ""),
                    }).value;
            });
        }
    }, [viewerRef]);

    return (
        <div
            ref={viewerRef}
            class="markdown-viewer"
            dangerouslySetInnerHTML={{ __html: result }}
        />
    );
}
