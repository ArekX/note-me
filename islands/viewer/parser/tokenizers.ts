import { Reader } from "./reader.ts";

export interface Token<T extends string, Data = never> {
    type: T;
    data?: Data;
    value: string;
}

export interface TokenizerState {
    isEscapeMode: boolean;
}

export type Tokenizer<T extends string, Data = never> = (
    reader: Reader<string>,
    state: TokenizerState,
) => Token<T, Data> | null;

const createCharacterTokenizer =
    <T extends string>(type: T, character: string): Tokenizer<T> =>
    (reader, state) => {
        if (state.isEscapeMode || reader.peek() !== character) {
            return null;
        }

        reader.next();
        return {
            type,
            value: character,
        };
    };

const tokenizeEscape: Tokenizer<"escape"> = (reader, state) => {
    if (reader.peek() !== "\\") {
        return null;
    }

    state.isEscapeMode = true;
    reader.next();

    return null;
};

const tokenizeHtmlTag: Tokenizer<"html-tag"> = (reader, state) => {
    if (reader.peek() !== "<") {
        return null;
    }

    if (state.isEscapeMode) {
        state.isEscapeMode = false;
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

const tokenizeBacktick: Tokenizer<"backtick"> = (reader, state) => {
    if (state.isEscapeMode || reader.peek() !== "`") {
        return null;
    }

    reader.next();

    let value = "";
    while (!reader.isEof() && reader.peek() !== "`") {
        value += reader.peek();
        reader.next();
    }

    reader.next();

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

const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const tokenizeNumber: Tokenizer<"number"> = (reader) => {
    let value = "";

    while (!reader.isEof() && numbers.includes(reader.peek() as string)) {
        value += reader.peek();
        reader.next();
    }

    return value.length > 0
        ? {
            type: "number",
            value,
        }
        : null;
};

const tokenizeNewLine = createCharacterTokenizer("new-line", "\n");
const tokenizeBlockquote = createCharacterTokenizer("blockquote", ">");
const tokenizeExclamation = createCharacterTokenizer("exclamation", "!");
const tokenizeStar = createCharacterTokenizer("star", "*");
const tokenizeUnderscore = createCharacterTokenizer("underscore", "_");
const tokenizeMinus = createCharacterTokenizer("minus", "-");
const tokenizeEquals = createCharacterTokenizer("equals", "=");
const tokenizeAtSign = createCharacterTokenizer("at-sign", "@");
const tokenizeHash = createCharacterTokenizer("hash", "#");
const tokenizeDot = createCharacterTokenizer("dot", ".");

const nonTextBlockChars = [
    "<",
    ">",
    "\n",
    "#",
    "`",
    "[",
    "!",
    " ",
    "@",
    "*",
    "_",
    "-",
    ".",
    ...numbers,
    "\\",
];

const tokenizeTextBlock: Tokenizer<"text-block"> = (reader, state) => {
    let value = "";
    while (!reader.isEof()) {
        const character = reader.peek() as string;

        if (nonTextBlockChars.includes(character)) {
            if (!state.isEscapeMode) {
                break;
            }

            state.isEscapeMode = false;
        }

        value += character;
        reader.next();
    }

    return {
        type: "text-block",
        value,
    };
};

export type TokenParser =
    | typeof tokenizeHtmlTag
    | typeof tokenizeHash
    | typeof tokenizeNewLine
    | typeof tokenizeBacktickBlock
    | typeof tokenizeNumber
    | typeof tokenizeBacktick
    | typeof tokenizeBlockquote
    | typeof tokenizeExclamation
    | typeof tokenizeBracket
    | typeof tokenizeEscape
    | typeof tokenizeDot
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
    tokenizeNumber,
    tokenizeEscape,
    tokenizeDot,
    tokenizeTextBlock,
];
