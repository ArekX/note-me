import { Marked } from "$frontend/deps.ts";

export type ViewerProps = {
    markdownText: string;
};

export default function Viewer({ markdownText = "" }: ViewerProps) {
    const result = Marked.parse(markdownText, {
        sanitize: true,
        tables: true,
    });

    return (
        <div
            class="markdown-viewer"
            style={{ all: "initial" }}
            dangerouslySetInnerHTML={{ __html: result }}
        />
    );
}
