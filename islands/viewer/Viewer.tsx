import { renderMarkdown } from "$islands/viewer/renderer.tsx";

export type ViewerProps = {
    text: string;
};

export default function Viewer({ text = "" }: ViewerProps) {
    return (
        <div class="markdown-viewer">
            {text.length > 0 && renderMarkdown(text)}
        </div>
    );
}
