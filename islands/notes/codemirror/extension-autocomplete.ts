import {
    type Completion,
    CompletionContext,
    type CompletionResult,
    type CompletionSource,
} from "$frontend/deps.ts";
import { NoteSearchResult, TreeRecord } from "$db";

interface AutocompleteDeps {
    searchNotes: (query: string) => Promise<NoteSearchResult[]>;
    loadGroups: () => Promise<TreeRecord[]>;
}

const triggerRegex = /\{:(?<name>[a-zA-Z0-9-]*)(?:\|(?<arg>[^}|{]*))?$/;

const extensionOptions: Completion[] = [
    {
        label: "note-link",
        detail: "dynamic link to a note",
        apply: "note-link|",
        type: "function",
    },
    {
        label: "note-list",
        detail: "dynamic list from a group",
        apply: "note-list|",
        type: "function",
    },
    {
        label: "table-of-contents",
        detail: "auto-generated TOC",
        apply: "table-of-contents}",
        type: "function",
    },
];

export const createExtensionCompletion = (
    deps: AutocompleteDeps,
): CompletionSource =>
async (ctx: CompletionContext): Promise<CompletionResult | null> => {
    const line = ctx.state.doc.lineAt(ctx.pos);
    const textBefore = line.text.slice(0, ctx.pos - line.from);

    const match = textBefore.match(triggerRegex);
    if (!match) return null;

    const name = match.groups?.name ?? "";
    const arg = match.groups?.arg;

    if (arg === undefined) {
        const from = ctx.pos - name.length;
        return {
            from,
            options: extensionOptions,
            validFor: /^[a-zA-Z0-9-]*$/,
        };
    }

    const argStart = ctx.pos - arg.length;

    if (name === "note-link") {
        try {
            const results = await deps.searchNotes(arg);
            if (ctx.aborted) return null;
            return {
                from: argStart,
                options: results.map((note): Completion => ({
                    label: String(note.id),
                    displayLabel: note.title,
                    detail: `#${note.id}`,
                    apply: `${note.id}}`,
                    type: "text",
                })),
            };
        } catch {
            return null;
        }
    }

    if (name === "note-list") {
        try {
            const groups = await deps.loadGroups();
            if (ctx.aborted) return null;
            return {
                from: argStart,
                options: groups.map((group): Completion => ({
                    label: String(group.id),
                    displayLabel: group.name,
                    detail: `#${group.id}`,
                    apply: `${group.id}}`,
                    type: "text",
                })),
            };
        } catch {
            return null;
        }
    }

    return null;
};
