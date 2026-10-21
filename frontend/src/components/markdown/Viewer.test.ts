import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Viewer from "./Viewer.vue";

const render = (text: string) => mount(Viewer, { props: { text } });

describe("Viewer", () => {
    it("renders a sample note", () => {
        const html = render(
            "## Plan `v1`\n\n- [x] done\n\n| a |\n|---|\n| 1 |\n\n<b>raw</b>",
        ).html();

        expect(html).toContain('<h2 id="note-h-plan-v1">');
        expect(html).toContain("bx-checkbox-checked");
        expect(html).toMatch(/<table>\s*<thead>\s*<tr>\s*<td>/);
        expect(html).toMatch(/<\/thead>\s*<tbody>\s*<tr>/);
        expect(html).toContain("&lt;b&gt;raw&lt;/b&gt;");
    });

    it("only links to safe URLs and opens external ones in a new tab", () => {
        const links = render(
            "[a](page.html) [b](#top) [c](https://e.com)",
        ).findAll("a");

        expect(links.map((link) => link.attributes("href"))).toEqual([
            "#",
            "#top",
            "https://e.com",
        ]);
        expect(links.map((link) => link.attributes("target"))).toEqual([
            "_self",
            "_self",
            "_blank",
        ]);
        expect(links[2]!.attributes("rel")).toBe("noopener noreferrer");
    });

    it("renders footnotes", () => {
        const wrapper = render("A[^1]\n\n[^1]: Note.");

        expect(wrapper.get(".footnote-ref sup").text()).toBe("1");
        expect(wrapper.get("#note-footnote-1").text()).toBe("1.");
    });

    it("highlights code in a known language and leaves others plain", () => {
        const html = render(
            "```js\nconst a = '<b>';\n```\n\n```nope\n<i>x</i>\n```",
        ).html();

        expect(html).toContain('<span class="hljs-keyword">const</span>');
        expect(html).toContain("&lt;b&gt;");
        expect(html).toContain("&lt;i&gt;x&lt;/i&gt;");
    });
});

describe("Viewer extensions", () => {
    const renderExtensions = (text: string, isSharing = false) =>
        mount(Viewer, {
            props: { text, options: { isSharing } },
            global: { stubs: { NoteList: true, NoteLink: true } },
        });

    it("renders note lists, note links and the table of contents", () => {
        const wrapper = renderExtensions(
            "# Top\n\n{:table-of-contents}\n\n{:note-list|3} {:note-link|7}",
        );

        expect(wrapper.get('a[href="#note-h-top"]').text()).toBe("Top");
        expect(
            wrapper.findComponent({ name: "NoteList" }).props("groupId"),
        ).toBe(3);
        expect(
            wrapper.findComponent({ name: "NoteLink" }).props("noteId"),
        ).toBe(7);
    });

    it("refuses note lists and links in share views", () => {
        const text = renderExtensions(
            "{:note-list|3} {:note-link|7}",
            true,
        ).text();

        expect(text).toContain("Note List is unavailble in share view.");
        expect(text).toContain("Note Link is unavailble in share view.");
    });

    it("plays audio and video from files and http(s) addresses only", () => {
        const wrapper = render(
            "{:audio|/file/abc}\n\n{:video|https://e.com/clip.mp4}\n\n{:video|javascript:alert(1)}",
        );
        expect(wrapper.get("audio").attributes()).toMatchObject({
            src: "/file/abc",
            controls: "",
        });
        expect(wrapper.get("video").attributes("src")).toBe(
            "https://e.com/clip.mp4",
        );
        expect(wrapper.findAll("video")).toHaveLength(1);
        expect(wrapper.text()).toContain(
            'Video needs an http(s) address or an uploaded file: "javascript:alert(1)"',
        );
    });

    it("aligns audio, video and images", () => {
        const wrapper = render(
            "{:audio|/file/abc|center}\n\n{:video|/file/v}\n\n{:image|/file/i|right|A cat}\n\n{:image|javascript:alert(1)|center}",
        );
        expect(wrapper.get("audio").element.parentElement!.className).toContain(
            "justify-center",
        );
        expect(wrapper.get("video").element.parentElement!.className).toContain(
            "justify-start",
        );
        const image = wrapper.get("img");
        expect(image.attributes()).toMatchObject({
            src: "/file/i",
            alt: "A cat",
        });
        expect(image.element.parentElement!.className).toContain("justify-end");
        expect(wrapper.findAll("img")).toHaveLength(1);
        expect(wrapper.text()).toContain(
            'Image address is not allowed: "javascript:alert(1)"',
        );
    });

    it("explains over-limit, unknown and escaped extensions", () => {
        const text = renderExtensions(
            "{:note-list|1} ".repeat(11) + "{:foo|a|b} \\{:note-link|1}",
        ).text();

        expect(text).toContain(
            'Could not render "note-list" extension #11. Too many extensions of this type in this text. Maximum allowed is 10.',
        );
        expect(text).toContain('Unknown extension: "foo", parameters: (a, b)');
        expect(text).toContain("{:note-link|1}");
    });
});
