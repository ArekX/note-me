<script setup lang="ts">
import HelpAction from "../HelpAction.vue";

interface MarkdownFeature {
    description: string;
    example: string;
    languagesLink?: boolean;
}

const features: MarkdownFeature[] = [
    {
        description:
            "Create heading for a specific level. Each # represents a level. Maximum level supported is 6.",
        example: "# Heading 1\n## Heading 2\n### Heading 3",
    },
    {
        description:
            "Create heading level 1. This is an alternative syntax for heading level 1.",
        example: "Heading level 1\n===============",
    },
    {
        description:
            "Create heading level 2. This is an alternative syntax for heading level 2.",
        example: "Heading level 2\n---------------",
    },
    {
        description: "Italicize the text. Either * or _ can be used.",
        example: "*italic*",
    },
    {
        description: "Bold the text. Either ** or __ can be used.",
        example: "**bold**",
    },
    {
        description: "Strike through the text.",
        example: "~~strikethrough text~~",
    },
    {
        description: "Highlight the text as preformatted code.",
        example: "`code`",
    },
    {
        description:
            "Highlight the text as code block. If a language is specified, syntax highlighting is applied. Check",
        example: "```js\nconst number = 2;\n``` \n\n\n ```\nCode block\n```",
        languagesLink: true,
    },
    {
        description: "Create a hyperlink.",
        example: "[click here](https://example.com)",
    },
    {
        description: "Insert an image.",
        example: "![Example image](https://example.com/image.png)",
    },
    {
        description: "Create a list item. Lists can be nested.",
        example: "- List item\n\t- Nested List item\n- List Item",
    },
    {
        description:
            'Escaping special characters. Use "\\" to escape special characters in markdown syntax.',
        example: "\\*italic\\*\n\n\\# Heading\n\n1\\. List item",
    },
    {
        description: "Create a numbered list item. Lists can be nested.",
        example: "1. List item 1\n\t1. Nested Item\n2. List Item 2",
    },
    {
        description: "Create a block quote. Quotes can be nested.",
        example: "> Quote\n>> Nested Quote\n>\n>Another Quote",
    },
    { description: "Render a horizontal rule.", example: "---" },
    {
        description: "Create a task list item.",
        example: "- [ ] Unchecked task\n- [x] Checked task",
    },
    {
        description: "Create a table.",
        example:
            "| Header 1 | Header 2 |\n|----------|----------|\n|  Cell 1  |  Cell 2  |",
    },
    {
        description: "Insert a footnote.",
        example: "Footnote[^1]\n\n[^1]: Footnote content",
    },
    {
        description:
            "Insert table of contents. This table of contents will be dynamically rendered using headings in the note.",
        example: "{:table-of-contents}",
    },
    {
        description:
            "Insert note link linking to a note by ID. Format is {:note-link|<NOTEID>}. IDs of the note can be found in Note Details or you can pick a note with the note link button of the toolbar.",
        example: "{:note-link|1}",
    },
    {
        description:
            "Insert a list of notes from a group by ID. Format is {:note-list|<GROUPID>}. Group ID can be found in Group Details or you can pick a group with the note list button of the toolbar.",
        example: "{:note-list|1}",
    },
    {
        description:
            "Insert an audio player. Format is {:audio|<URL>|<ALIGN>}, where the URL is an http(s) address or an uploaded file (pick one with the file button of the toolbar) and the optional ALIGN is left, center or right.",
        example: "{:audio|https://example.com/song.mp3|center}",
    },
    {
        description:
            "Insert a video player. Format is {:video|<URL>|<ALIGN>}, where the URL is an http(s) address or an uploaded file and the optional ALIGN is left, center or right.",
        example: "{:video|https://example.com/clip.mp4}",
    },
    {
        description:
            "Insert an aligned image. Format is {:image|<URL>|<ALIGN>|<DESCRIPTION>}, where ALIGN is left, center or right and the description is optional. In the rich editor, select an image and pick the alignment above it.",
        example: "{:image|https://example.com/cat.png|center|A cat}",
    },
];
</script>

<template>
    <div class="p-2">
        <h2 class="text-lg font-bold">Markdown syntax</h2>
        <p class="py-2">
            Following table contains all the markdown syntax supported by
            NoteMe.
        </p>
        <table>
            <thead>
                <tr>
                    <th class="w-3/5">Description</th>
                    <th class="w-1/5">Example Usage</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="feature in features" :key="feature.example">
                    <td class="w-3/5">
                        {{ feature.description }}
                        <template v-if="feature.languagesLink">
                            <HelpAction page="supported-language-highlights">
                                supported languages</HelpAction
                            >
                            for all possible values.
                        </template>
                    </td>
                    <td class="w-2/5">
                        <pre>{{ feature.example }}</pre>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
