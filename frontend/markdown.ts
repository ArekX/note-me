import { Token, tokens } from "$frontend/deps.ts";

export interface AstToken {
    type:
        | "root"
        | "list"
        | "listItem"
        | "codeBlock"
        | Token["type"];
    content?: string;
}

export interface AstTokenWithChildren extends AstToken {
    children: (AstToken | AstTokenWithChildren)[];
}

const toSyntaxTree = (tokens: Token[]): AstTokenWithChildren => {
    const root: AstTokenWithChildren = {
        type: "root",
        children: [],
    };
    const stack: AstTokenWithChildren[] = [root];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type == "end") {
            if (stack.length == 1) {
                return root;
            }

            stack.pop();
            continue;
        } else if (token.type == "start") {
            const parentToken: AstTokenWithChildren = {
                ...token,
                type: token.tag as AstToken["type"],
                children: [],
            };
            stack[stack.length - 1].children.push(parentToken);
            stack.push(parentToken);
            continue;
        }

        if (token.type === "html") {
            token.type = "text";
        }

        stack[stack.length - 1].children.push(token as AstToken);
    }

    return root;
};

export const parseMarkdown = (markdownText: string): AstTokenWithChildren =>
    toSyntaxTree(tokens(markdownText, {
        footnotes: true,
        tables: true,
        strikethrough: true,
        tasklists: true,
        smartPunctuation: true,
    }));
