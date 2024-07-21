import { diff } from "$frontend/deps.ts";

export type DiffLine = {
    type: "added" | "removed" | "same";
    value: string;
} | {
    type: "changed";
    from: string;
    to: string;
};

export const diffText = (a: string, b: string): DiffLine[] => {
    const aLines = a.split("\n");
    const bLines = b.split("\n");

    const diffLines = diff(aLines, bLines);

    const lines = aLines.length > bLines.length ? aLines : bLines;

    return lines.map((value, i) => {
        const diffLine = diffLines.find((x) => x.p[0] === i);

        if (diffLine?.t === 2) {
            return {
                type: "changed",
                from: value,
                to: diffLine.v! as string,
            };
        }

        return {
            type: diffLine ? (diffLine.t === 0 ? "removed" : "added") : "same",
            value,
        };
    });
};
