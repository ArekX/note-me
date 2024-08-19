export const getTagArray = (tagString: string) => {
    const sanitizedTagString = tagString
        .replace(/[^a-zA-Z0-9_# -]+/g, "")
        .replace(/#/g, " ")
        .replace(/ {2,}/g, " ")
        .replace(/\-{2,}/g, "-")
        .replace(/\_{2,}/g, "_")
        .trim();
    if (sanitizedTagString.length == 0) {
        return [];
    }

    return Array.from(new Set(sanitizedTagString.split(" ")));
};

export const getFormattedTagString = (tagString: string) => {
    const tags = getTagArray(tagString);
    return tagsToString(tags);
};

export const tagsToString = (tags: string[]) => {
    return tags.length > 0 ? `#${tags.join(" #")}` : "";
};

export const findTagSides = (text: string, position: number) => {
    let rightIndex = text.length;

    if (text[position] === "#") {
        position++;
    }

    if (text[position] === " ") {
        return null;
    }

    for (let i = position; i <= text.length; i++) {
        if (text[i] === "#" || text[i] === " ") {
            break;
        }
        rightIndex = i;
    }

    let leftIndex = 0;
    for (let i = position; i >= 0; i--) {
        if (text[i] === " ") {
            break;
        }

        leftIndex = i;

        if (text[i] === "#") {
            break;
        }
    }

    console.log(text, position, leftIndex, rightIndex);

    if (
        text.trim().length === 0 || leftIndex === rightIndex || text === "#"
    ) {
        return null;
    }

    return {
        tag: text.substring(leftIndex, rightIndex + 1).replace(/#/g, ""),
        leftIndex,
        rightIndex,
    };
};
