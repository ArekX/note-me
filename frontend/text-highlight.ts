export interface TextPart {
    type: "text" | "highlight";
    value: string;
}

const addPartToLines = (parts: TextPart[], lines: TextPart[][]) => {
    // Since search results are limited to 3 lines, we don't need to show
    // lines which don't have anything found in them as they do not
    // interest us.
    if (parts.find((p) => p.type === "highlight") !== undefined) {
        lines.push(parts);
    }
};

const splitByClosestWord = (text: string, start: number) => {
    const splitAt = findNextClosestSpace(text, start);

    if (splitAt >= text.length) {
        return [
            text.substring(0, start),
            text.substring(start),
        ];
    }

    return [
        text.substring(0, splitAt),
        text.substring(splitAt),
    ];
};

const findNextClosestSpace = (text: string, start: number) => {
    while (text[start] !== " " && start < text.length) {
        start++;
    }

    return start < text.length ? start : text.length - 1;
};

const findPreviousClosestSpace = (text: string, start: number) => {
    while (text[start] !== " " && start > 0) {
        start--;
    }

    return start >= 0 ? start : 0;
};

export const findHighlightedLines = (
    text: string,
    search: string,
    lengthPerLine: number,
) => {
    text = text.replace(/[\n\r]/g, " ");
    const searchString = search.toLowerCase();

    let foundIndex = text.toLowerCase().indexOf(searchString);

    let currentLineLength = 0;

    const partLines: TextPart[][] = [];

    let parts: TextPart[] = [];

    while (foundIndex > -1 && partLines.length < 3) {
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

            leftText = "..." + leftText.substring(
                leftIndex,
                foundIndex,
            );
        }

        if (currentLineLength + leftText.length > lengthPerLine) {
            const diff = lengthPerLine - currentLineLength;

            const [left, right] = splitByClosestWord(leftText, diff);

            parts.push({ type: "text", value: left });

            addPartToLines(parts, partLines);

            parts = [
                { type: "text", value: right },
            ];
            currentLineLength = parts[0].value.length;
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

        // In case highlighted is a partial word, add rest of the word to the same
        // line so that it doesn't break the word into the new line.
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
            foundIndex = additionalWordIndex;
            text = text.substring(additionalWordIndex);
        } else {
            text = text.substring(foundIndex + search.length);
        }

        foundIndex = text.toLowerCase().indexOf(searchString);
    }

    if (partLines.length < 3) {
        parts.push({ type: "text", value: text });
        addPartToLines(parts, partLines);
    }

    return partLines;
};
