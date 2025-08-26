import { useEffect, useRef } from "preact/hooks";
import { ComponentChildren } from "preact";
import { mermaid } from "$frontend/deps.ts";

export interface MermaidDiagramProps {
    children: ComponentChildren;
}

let counter = 0;

export default function MermaidDiagram(
    { children }: MermaidDiagramProps,
) {
    const viewerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!viewerRef.current) {
            return;
        }

        const code = viewerRef.current.textContent ?? "";

        mermaid.render(`diagram-${counter++}`, code).then((result) => {
            if (viewerRef.current) {
                viewerRef.current.innerHTML = result.svg;
            }
        });
    }, [viewerRef]);

    return (
        <div ref={viewerRef} class="mermaid-diagram">
            {children}
        </div>
    );
}
