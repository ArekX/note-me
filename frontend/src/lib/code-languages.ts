import hljs from "highlight.js";

export interface CodeLanguage {
    id: string;
    name: string;
    aliases: string[];
}

// Built from the highlight.js bundle code blocks are rendered with, so it
// always matches what the viewer highlights.
export const codeLanguages: CodeLanguage[] = hljs
    .listLanguages()
    .map((id) => {
        const language = hljs.getLanguage(id);
        return {
            id,
            name: language?.name ?? id,
            aliases: [id, ...(language?.aliases ?? [])],
        };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

export const findCodeLanguage = (alias: string) =>
    codeLanguages.find((language) => language.aliases.includes(alias));
