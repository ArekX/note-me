export interface AnsiSegment {
    text: string;
    color: string | null;
}

// The server log colours levels (31 red, 32 green, 33 yellow) and context
// tags (90 gray); 0 resets. Anything else is dropped from the output.
const colorClasses: Record<string, string> = {
    "31": "text-danger",
    "32": "text-success",
    "33": "text-warning",
    "90": "text-muted",
};

const escapePattern = /\x1b\[([0-9;]*)m/g;

export const parseAnsi = (line: string): AnsiSegment[] => {
    const segments: AnsiSegment[] = [];
    let color: string | null = null;
    let last = 0;

    const push = (text: string) => {
        if (text) {
            segments.push({ text, color });
        }
    };

    for (const match of line.matchAll(escapePattern)) {
        push(line.slice(last, match.index));
        last = match.index + match[0].length;
        const code = match[1] ?? "";
        color =
            code === "" || code === "0" ? null : (colorClasses[code] ?? color);
    }
    push(line.slice(last));

    return segments;
};
