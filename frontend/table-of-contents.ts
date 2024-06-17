import { parsePipeline } from "$frontend/markdown.ts";

export interface TocItem {
    level: number;
    text: string;
    children: TocItem[];
}

export const parseTableOfContents = (markdownText: string): TocItem[] => {
    const result: TocItem[] = [];

    const tokens = parsePipeline(markdownText);

    let headerText = "";
    let headerLevel = 0;

    const root: TocItem = {
        level: 0,
        text: "root",
        children: [],
    };

    const stack: TocItem[] = [root];

    for (const token of tokens) {
        if (token.type === "start" && token.tag === "heading") {
            headerLevel = token.level;
            headerText = "";
        }

        if (token.type === "text") {
            headerText += token.content;
        }

        if (token.type === "end" && token.tag === "heading") {
            const item: TocItem = {
                level: headerLevel,
                text: headerText,
                children: [],
            };
            result.push(item);

            while (
                stack.length > 0 &&
                stack[stack.length - 1].level >= item.level
            ) {
                stack.pop();
            }
            const last = stack[stack.length - 1];

            if (last) {
                last.children.push(item);
            }

            stack.push(item);
        }
    }

    return root.children;
};
