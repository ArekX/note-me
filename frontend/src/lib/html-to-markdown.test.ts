import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./html-to-markdown";

describe("htmlToMarkdown", () => {
    it("makes the first heading the title and later ones sections", () => {
        expect(
            htmlToMarkdown(
                "<div><h2>Title</h2><h1>Section</h1><h2>Other</h2><h3>Sub</h3></div>",
            ),
        ).toBe("# Title\n\n## Section\n\n## Other\n\n### Sub\n");
    });

    it("collapses whitespace in paragraphs and skips comments", () => {
        expect(
            htmlToMarkdown(
                "<!--[--><p>  One\n   two <!---->three </p><p>Four</p><!--]-->",
            ),
        ).toBe("One two three\n\nFour\n");
    });

    it("writes inline formatting", () => {
        expect(
            htmlToMarkdown(
                '<p>A <strong>bold</strong> <em>word</em>, <code>MAX_SIZE</code> and <a href="/app" class="link">a link</a>.</p>',
            ),
        ).toBe("A **bold** *word*, `MAX_SIZE` and a link.\n");
    });

    it("keeps the spaces around inline formatting", () => {
        expect(htmlToMarkdown("<p>a<strong> OR </strong>b</p>")).toBe(
            "a **OR** b\n",
        );
    });

    it("decodes entities", () => {
        expect(
            htmlToMarkdown(
                "<p>&lt;file&gt; &amp; &quot;x&quot; &#39;y&#39; &#x2192;</p>",
            ),
        ).toBe("<file> & \"x\" 'y' →\n");
    });

    it("writes unordered, ordered and nested lists", () => {
        expect(
            htmlToMarkdown(
                "<ul><li>One</li><li>Two<ul><li>Nested</li></ul></li></ul><ol><li>First</li><li>Second</li></ol>",
            ),
        ).toBe("- One\n- Two\n  - Nested\n\n1. First\n2. Second\n");
    });

    it("fences multi-line pre blocks", () => {
        expect(htmlToMarkdown("<pre>\nline 1\nline 2\n</pre>")).toBe(
            "```\nline 1\nline 2\n```\n",
        );
    });

    it("fences a standalone one-line pre block", () => {
        expect(htmlToMarkdown("<p>Run:</p><pre>make build</pre>")).toBe(
            "Run:\n\n```\nmake build\n```\n",
        );
    });

    it("uses longer fences for code containing backticks", () => {
        expect(htmlToMarkdown("<pre>```js\nx\n```</pre>")).toBe(
            "````\n```js\nx\n```\n````\n",
        );
        expect(htmlToMarkdown("<p><code>`code`</code></p>")).toBe(
            "`` `code` ``\n",
        );
    });

    it("writes a simple table as a markdown table", () => {
        expect(
            htmlToMarkdown(
                '<table><thead><tr><th>Key</th><th>Use</th></tr></thead><tbody><tr><td>ctrl+s</td><td>Save</td></tr><tr><td><pre class="inline">a|b</pre> <strong>OR</strong> <pre class="inline">c</pre></td><td>Pipe</td></tr></tbody></table>',
            ),
        ).toBe(
            "| Key | Use |\n| --- | --- |\n| ctrl+s | Save |\n| `a\\|b` **OR** `c` | Pipe |\n",
        );
    });

    it("writes a table with multi-line cells as labelled rows", () => {
        expect(
            htmlToMarkdown(
                "<table><thead><tr><th>Description</th><th>Example</th></tr></thead><tbody><tr><td>Heading</td><td><pre># One\n## Two</pre></td></tr><tr><td>Rule</td><td><pre>---</pre></td></tr></tbody></table>",
            ),
        ).toBe(
            "- Description: Heading\n  Example:\n\n  ```\n  # One\n  ## Two\n  ```\n\n- Description: Rule\n  Example: `---`\n",
        );
    });

    it("drops scripts, styles and buttons", () => {
        expect(
            htmlToMarkdown(
                "<p>Text</p><script>alert(1)</script><style>p{}</style><button>Close</button>",
            ),
        ).toBe("Text\n");
    });
});
