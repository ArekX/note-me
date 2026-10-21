import { parseMarkdown, type AstNode } from "./markdown";

// Identifiers of uploaded files linked or shown
// as images in a note, relative or with this site's origin.
export const findFileIdentifiers = (markdownText: string): string[] => {
    const identifiers = new Set<string>();
    const pattern = new RegExp(
        `^(${location.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?/file/([a-zA-Z0-9-]+)`,
    );

    const visit = (node: AstNode) => {
        const url =
            node.type === "link"
                ? node.data.url
                : node.type === "image"
                  ? node.url
                  : null;
        const match = url ? pattern.exec(url) : null;
        if (match) {
            identifiers.add(match[2]!);
        }
        if ("children" in node) {
            node.children.forEach(visit);
        }
    };
    visit(parseMarkdown(markdownText));

    return [...identifiers];
};
