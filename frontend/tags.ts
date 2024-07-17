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

    for (let i = position - 1; i <= text.length - 1; i++) {
        if (text[i] === "#" || text[i] === " ") {
            rightIndex = i;
            break;
        }
    }

    let leftIndex = 0;
    for (let i = position - 1; i >= 0; i--) {
        if (text[i] === "#" || text[i] === " ") {
            leftIndex = i;
            break;
        }
    }

    if (
        text.trim().length === 0 || leftIndex === rightIndex || text === "#"
    ) {
        return null;
    }

    return {
        tag: text.substring(leftIndex + 1, rightIndex),
        leftIndex,
        rightIndex,
    };
};
