import { Reader } from "./reader.ts";

export interface Token<T extends string, Data = never> {
    type: T;
    data?: Data;
    value: string;
}

export type Tokenizer<T extends string, Data = never> = (
    reader: Reader<string>,
) => Token<T, Data> | null;

const tokenizeHtmlTag: Tokenizer<"html-tag"> = (reader) => {
    if (reader.peek() !== "<") {
        return null;
    }

    let value = "";
    while (!reader.isEof() && reader.peek() !== ">") {
        value += reader.peek();
        reader.next();
    }

    value += reader.peek();
    reader.next();

    return {
        type: "html-tag",
        value,
    };
};

const tokenizeNewLine: Tokenizer<"new-line"> = (reader) => {
    if (reader.peek() === "\n") {
        reader.next();
        return {
            type: "new-line",
            value: "\n",
        };
    }

    return null;
};

const tokenizeBacktick: Tokenizer<"backtick"> = (reader) => {
    if (reader.peek() !== "`") {
        return null;
    }

    reader.next();

    let value = "";
    while (!reader.isEof() && reader.peek() !== "`") {
        value += reader.peek();
        reader.next();
    }

    return {
        type: "backtick",
        value,
    };
};

const tokenizeBacktickBlock: Tokenizer<"backtick-block", { language: string }> =
    (reader) => {
        if (reader.peek(3) !== "```") {
            return null;
        }

        reader.next(3);

        let language = "";
        while (!reader.isEof() && reader.peek() !== "\n") {
            language += reader.peek();
            reader.next();
        }

        reader.next();

        let value = "";
        while (!reader.isEof() && reader.peek(3) !== "```") {
            value += reader.peek();
            reader.next();
        }

        reader.next(3);

        return {
            type: "backtick-block",
            data: { language },
            value,
        };
    };

const tokenizeBlockquote: Tokenizer<"blockquote"> = (reader) => {
    if (reader.peek() !== ">") {
        return null;
    }
    reader.next();

    return {
        type: "blockquote",
        value: ">",
    };
};

const tokenizeExclamation: Tokenizer<
    "exclamation"
> = (
    reader,
) => {
    if (reader.peek() !== "!") {
        return null;
    }

    reader.next();

    return {
        type: "exclamation",
        value: "!",
    };
};

const tokenizeBracket: Tokenizer<
    "bracket"
> = (
    reader,
) => {
    if (reader.peek() !== "[") {
        return null;
    }

    reader.next();

    let value = "";
    while (!reader.isEof() && reader.peek() !== "]") {
        value += reader.peek();
        reader.next();
    }

    reader.next();

    return {
        type: "bracket",
        value: value,
    };
};

const tokenizeParentheses: Tokenizer<
    "parentheses"
> = (
    reader,
) => {
    if (reader.peek() !== "(") {
        return null;
    }

    reader.next();

    let value = "";
    while (!reader.isEof() && reader.peek() !== ")") {
        value += reader.peek();
        reader.next();
    }

    reader.next();

    return {
        type: "parentheses",
        value: value,
    };
};

const tokenizeStar: Tokenizer<
    "star"
> = (
    reader,
) => {
    if (reader.peek() !== "*") {
        return null;
    }

    reader.next();

    return {
        type: "star",
        value: "*",
    };
};

const tokenizeUnderscore: Tokenizer<
    "underscore"
> = (
    reader,
) => {
    if (reader.peek() !== "_") {
        return null;
    }
    reader.next();

    return {
        type: "underscore",
        value: "_",
    };
};

const tokenizeMinus: Tokenizer<
    "minus"
> = (
    reader,
) => {
    if (reader.peek() !== "-") {
        return null;
    }

    reader.next();

    return {
        type: "minus",
        value: "-",
    };
};

const tokenizeEquals: Tokenizer<
    "equals"
> = (
    reader,
) => {
    if (reader.peek() !== "=") {
        return null;
    }

    reader.next();

    return {
        type: "equals",
        value: "=",
    };
};

const nonTextBlockChars = [
    "<",
    ">",
    "\n",
    "#",
    "`",
    "[",
    "!",
    " ",
    "*",
    "_",
    "-",
];

const tokenizeWhitespace: Tokenizer<"whitespace"> = (reader) => {
    if (reader.peek() !== " ") {
        return null;
    }

    let value = "";
    while (!reader.isEof() && reader.peek() === " ") {
        value += reader.peek();
        reader.next();
    }

    return {
        type: "whitespace",
        value: value,
    };
};

const tokenizeTextBlock: Tokenizer<"text-block"> = (reader) => {
    let value = "";
    while (
        !reader.isEof() && !nonTextBlockChars.includes(reader.peek() as string)
    ) {
        value += reader.peek();
        reader.next();
    }

    return {
        type: "text-block",
        value,
    };
};

const tokenizeAtSign: Tokenizer<"at-sign"> = (reader) => {
    if (reader.peek() !== "@") {
        return null;
    }

    reader.next();

    return {
        type: "at-sign",
        value: "@",
    };
};

const tokenizeHash: Tokenizer<"hash"> = (reader) => {
    if (reader.peek() !== "#") {
        return null;
    }

    reader.next();

    return {
        type: "hash",
        value: "#",
    };
};

export type TokenParser =
    | typeof tokenizeHtmlTag
    | typeof tokenizeHash
    | typeof tokenizeNewLine
    | typeof tokenizeBacktickBlock
    | typeof tokenizeBacktick
    | typeof tokenizeBlockquote
    | typeof tokenizeExclamation
    | typeof tokenizeBracket
    | typeof tokenizeParentheses
    | typeof tokenizeWhitespace
    | typeof tokenizeStar
    | typeof tokenizeUnderscore
    | typeof tokenizeMinus
    | typeof tokenizeEquals
    | typeof tokenizeAtSign
    | typeof tokenizeTextBlock;

export type ParsedToken = NonNullable<ReturnType<TokenParser>>;

export const tokenizers: TokenParser[] = [
    tokenizeHtmlTag,
    tokenizeHash,
    tokenizeNewLine,
    tokenizeBacktickBlock,
    tokenizeBacktick,
    tokenizeBlockquote,
    tokenizeExclamation,
    tokenizeBracket,
    tokenizeParentheses,
    tokenizeWhitespace,
    tokenizeStar,
    tokenizeUnderscore,
    tokenizeMinus,
    tokenizeEquals,
    tokenizeAtSign,
    tokenizeTextBlock,
];
