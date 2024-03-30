import { useMemo } from "preact/hooks";
import { createReader } from "./parser/reader.ts";
import { lex } from "./parser/lexer.ts";
import { parse } from "./parser/parser.ts";

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
        const ast = parse(lex(`
            idemo niis
            # idemo niis
            ## idemo niis
            ### idemo niis
            #### idemo niis
            ##### idemo niis

            ![ovo je alt text](https://google.com)

            [nako neki](https://google.com)
        
        `));

        console.log(ast);

        return text;
    }, [text]);

    return (
        <div class="markdown-viewer">
            <pre>{parsedText}</pre>
        </div>
    );
}
