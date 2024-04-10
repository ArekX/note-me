import { useMemo } from "preact/hooks";
import { renderMarkdown } from "$islands/viewer/renderer.tsx";

export type ViewerProps = {
    text: string;
};

export default function Viewer({ text = "" }: ViewerProps) {
    const components = useMemo(() => renderMarkdown(text), [
        text,
    ]);

    return (
        <div class="markdown-viewer">
            {components}
        </div>
    );
}
