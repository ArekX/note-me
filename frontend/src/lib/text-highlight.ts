export interface TextPart {
    type: "text" | "highlight";
    value: string;
}

const MAX_LINES = 3;

// Only lines with a match are kept; results show at most three lines.
const addPartToLines = (parts: TextPart[], lines: TextPart[][]) => {
    if (parts.some((p) => p.type === "highlight")) {
        lines.push(parts);
    }
};

const findNextClosestSpace = (text: string, start: number) => {
    const oldStart = start;
    while (text[start] !== " " && start < text.length) {
        start++;
    }

    return start < text.length ? start : oldStart;
};

const findPreviousClosestSpace = (text: string, start: number) => {
    while (text[start] !== " " && start > 0) {
        start--;
    }

    return start >= 0 ? start : 0;
};

const splitByClosestWord = (text: string, start: number) => {
    const splitAt = findNextClosestSpace(text, start);

    if (splitAt >= text.length) {
        return [text.substring(0, start), text.substring(start)] as const;
    }

    return [text.substring(0, splitAt), text.substring(splitAt)] as const;
};

export const findHighlightedLines = (
    text: string,
    search: string,
    lengthPerLine: number,
): TextPart[][] => {
    if (text.length === 0 || search.length === 0) {
        return [];
    }

    text = text.replace(/[\n\r]/g, " ");
    const searchString = search.toLowerCase();

    let foundIndex = text.toLowerCase().indexOf(searchString);
    let currentLineLength = 0;
    const partLines: TextPart[][] = [];
    let parts: TextPart[] = [];

    while (foundIndex > -1 && partLines.length < MAX_LINES) {
        let leftText = text.substring(0, foundIndex);
        const highlighted = text.substring(
            foundIndex,
            foundIndex + search.length,
        );

        if (leftText.length > lengthPerLine) {
            let leftIndex = findPreviousClosestSpace(leftText, foundIndex);

            if (foundIndex - leftIndex > lengthPerLine) {
                leftIndex = Math.max(
                    0,
                    foundIndex - Math.round(lengthPerLine / 3),
                );
            }

            leftText = "..." + leftText.substring(leftIndex, foundIndex);
        }

        if (currentLineLength + leftText.length > lengthPerLine) {
            const [left, right] = splitByClosestWord(
                leftText,
                lengthPerLine - currentLineLength,
            );

            parts.push({ type: "text", value: left });
            addPartToLines(parts, partLines);

            parts = [{ type: "text", value: right }];
            currentLineLength = right.length;
        } else {
            parts.push({ type: "text", value: leftText });
            currentLineLength += leftText.length;
        }

        if (currentLineLength + highlighted.length > lengthPerLine) {
            addPartToLines(parts, partLines);
            parts = [];
            currentLineLength = 0;
        }

        parts.push({ type: "highlight", value: highlighted });
        currentLineLength += highlighted.length;

        // The rest of a partly matched word stays on the same line.
        const additionalWordIndex = findNextClosestSpace(
            text,
            foundIndex + search.length,
        );
        const additional = text.substring(
            foundIndex + search.length,
            additionalWordIndex,
        );

        if (additional.trim().length > 0) {
            parts.push({ type: "text", value: additional });
            currentLineLength += additional.length;
            text = text.substring(additionalWordIndex);
        } else {
            text = text.substring(foundIndex + search.length);
        }

        foundIndex = text.toLowerCase().indexOf(searchString);
    }

    if (partLines.length < MAX_LINES) {
        parts.push({ type: "text", value: text });
        addPartToLines(parts, partLines);
    }

    return partLines;
};
