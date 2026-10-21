import type {
    Completion,
    CompletionContext,
    CompletionResult,
    CompletionSource,
} from "@codemirror/autocomplete";

export interface AutocompleteItem {
    id: number;
    name: string;
}

interface AutocompleteDeps {
    searchNotes: (query: string) => Promise<AutocompleteItem[]>;
    loadGroups: () => Promise<AutocompleteItem[]>;
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
        label: "audio",
        detail: "audio player for a URL or file",
        apply: "audio|",
        type: "function",
    },
    {
        label: "video",
        detail: "video player for a URL or file",
        apply: "video|",
        type: "function",
    },
    {
        label: "image",
        detail: "aligned image",
        apply: "image|",
        type: "function",
    },
    {
        label: "table-of-contents",
        detail: "auto-generated TOC",
        apply: "table-of-contents}",
        type: "function",
    },
];

const itemOption = (item: AutocompleteItem): Completion => ({
    label: String(item.id),
    displayLabel: item.name,
    detail: `#${item.id}`,
    apply: `${item.id}}`,
    type: "text",
});

export const createExtensionCompletion =
    (deps: AutocompleteDeps): CompletionSource =>
    async (ctx: CompletionContext): Promise<CompletionResult | null> => {
        const line = ctx.state.doc.lineAt(ctx.pos);
        const match = line.text
            .slice(0, ctx.pos - line.from)
            .match(triggerRegex);
        if (!match) {
            return null;
        }

        const name = match.groups?.name ?? "";
        const arg = match.groups?.arg;

        if (arg === undefined) {
            return {
                from: ctx.pos - name.length,
                options: extensionOptions,
                validFor: /^[a-zA-Z0-9-]*$/,
            };
        }

        const load =
            name === "note-link"
                ? () => deps.searchNotes(arg)
                : name === "note-list"
                  ? deps.loadGroups
                  : null;
        if (!load) {
            return null;
        }

        try {
            const items = await load();
            if (ctx.aborted) {
                return null;
            }
            return {
                from: ctx.pos - arg.length,
                options: items.map(itemOption),
            };
        } catch {
            return null;
        }
    };
