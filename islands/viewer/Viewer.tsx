import { parseMarkdown } from "$frontend/markdown.ts";
import { useMemo } from "preact/hooks";
import {
    createComponent,
    markdownToComponents,
} from "$islands/viewer/renderer.tsx";

export type ViewerProps = {
    text: string;
};

export default function Viewer({ text = "" }: ViewerProps) {
    console.log(parseMarkdown(text));

    const components = useMemo(() => markdownToComponents(text), [
        text,
    ]);

    return (
        <div class="markdown-viewer">
            {components}
        </div>
    );
}
