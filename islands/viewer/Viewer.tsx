import { useMemo } from "preact/hooks";
import { createReader } from "./parser/reader.ts";
import { lex } from "./parser/lexer.ts";

export type ViewerProps = {
    text: string;
};

export default function Viewer({ text = "" }: ViewerProps) {
    // useEffect(() => {
    //     if (viewerRef.current) {
    //         viewerRef.current.querySelectorAll("pre code").forEach((block) => {
    //             block.innerHTML =
    //                 highlightJs.highlight(block.textContent ?? "", {
    //                     language: block.classList[0].replace("lang-", ""),
    //                 }).value;
    //         });
    //     }
    // }, [viewerRef]);

    const parsedText = useMemo(() => {
        const tokens = lex(createReader(text));

        console.log(tokens);

        return text;
    }, [text]);

    return (
        <div class="markdown-viewer">
            <pre>{parsedText}</pre>
        </div>
    );
}
