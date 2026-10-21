import { describe, expect, it, vi } from "vitest";
import {
    CompletionContext,
    type CompletionResult,
} from "@codemirror/autocomplete";
import { EditorState } from "@codemirror/state";
import { createExtensionCompletion } from "./extension-autocomplete";

const complete = async (doc: string) => {
    const searchNotes = vi.fn(async () => [{ id: 4, name: "Plan" }]);
    const loadGroups = vi.fn(async () => [{ id: 2, name: "Work" }]);
    const source = createExtensionCompletion({ searchNotes, loadGroups });
    const state = EditorState.create({ doc });
    const result = (await source(
        new CompletionContext(state, doc.length, true),
    )) as CompletionResult | null;
    return { result, searchNotes, loadGroups };
};

describe("extension autocomplete", () => {
    it("offers extension names after {:", async () => {
        const { result } = await complete("See {:no");
        expect(result?.from).toBe(6);
        expect(result?.options.map((o) => o.apply)).toEqual([
            "note-link|",
            "note-list|",
            "audio|",
            "video|",
            "image|",
            "table-of-contents}",
        ]);
    });

    it("searches notes for note-link and lists groups for note-list", async () => {
        const link = await complete("{:note-link|pl");
        expect(link.searchNotes).toHaveBeenCalledWith("pl");
        expect(link.result).toMatchObject({
            from: 12,
            options: [{ label: "4", displayLabel: "Plan", apply: "4}" }],
        });

        const list = await complete("{:note-list|");
        expect(list.loadGroups).toHaveBeenCalled();
        expect(list.result?.options[0]).toMatchObject({
            displayLabel: "Work",
            apply: "2}",
        });
    });

    it("stays quiet outside an extension or for other names", async () => {
        expect((await complete("plain text")).result).toBeNull();
        expect((await complete("{:note-link|1} after")).result).toBeNull();
        expect((await complete("{:toc|x")).result).toBeNull();
    });
});
