import { diffArrays } from "diff";

export type DiffLine =
    | { type: "added" | "removed" | "same"; value: string }
    | { type: "changed"; from: string; to: string };

// A removed run directly followed by an added run is shown as changed lines,
// paired one to one; whatever is left over stays removed or added.
export const diffText = (from: string, to: string): DiffLine[] => {
    const chunks = diffArrays(from.split("\n"), to.split("\n"));
    const lines: DiffLine[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const next = chunks[i + 1];

        if (chunk.removed && next?.added) {
            const paired = Math.min(chunk.value.length, next.value.length);
            for (let j = 0; j < paired; j++) {
                lines.push({
                    type: "changed",
                    from: chunk.value[j]!,
                    to: next.value[j]!,
                });
            }
            for (const value of chunk.value.slice(paired)) {
                lines.push({ type: "removed", value });
            }
            for (const value of next.value.slice(paired)) {
                lines.push({ type: "added", value });
            }
            i++;
            continue;
        }

        const type = chunk.added ? "added" : chunk.removed ? "removed" : "same";
        for (const value of chunk.value) {
            lines.push({ type, value });
        }
    }

    return lines;
};
