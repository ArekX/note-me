import { parsePipeline } from "$frontend/markdown.ts";

export const findFileIdentifiers = (markdownText: string): string[] => {
    const tokens = parsePipeline(markdownText);

    const identifiers: Set<string> = new Set();

    const fileRegex = new RegExp(
        `^(${location.origin})?\/file\/([a-zA-Z0-9-]+)`,
        "g",
    );

    for (const token of tokens) {
        if (
            (token.type === "start" && token.tag === "link") ||
            token.type === "image"
        ) {
            fileRegex.exec("");
            const result = fileRegex.exec(token.url);
            if (!result) {
                continue;
            }

            identifiers.add(result[2]);
        }
    }

    return Array.from(identifiers);
};
