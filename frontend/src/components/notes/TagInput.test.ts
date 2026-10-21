import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { useSocketStore } from "@/stores/socket";
import TagChipsInput from "./TagChipsInput.vue";
import TagInput from "./TagInput.vue";

const options = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));

describe("TagInput", () => {
    beforeEach(async () => {
        // jsdom has no layout.
        Element.prototype.scrollIntoView = vi.fn();
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("normalises the tags on blur", async () => {
        const wrapper = mount(TagInput, { props: { initialTags: ["a"] } });
        const input = wrapper.get("input");
        expect(input.element.value).toBe("#a");

        await input.setValue("#Work  foo!! #Work");
        await input.trigger("blur");

        expect(input.element.value).toBe("#Work #foo");
        expect(wrapper.emitted("change")?.at(-1)).toEqual([["Work", "foo"]]);
    });

    it("completes the tag under the caret from findTags", async () => {
        const wrapper = mount(TagInput, {
            props: { initialTags: [] },
            attachTo: document.body,
        });
        const input = wrapper.get("input");

        await input.setValue("#idea #to");
        input.element.setSelectionRange(9, 9);
        await input.trigger("keyup", { key: "o" });

        await vi.waitFor(() =>
            expect(options().map((o) => o.textContent?.trim())).toEqual([
                "#todo",
            ]),
        );

        await input.trigger("keydown", { key: "Enter" });
        expect(input.element.value).toBe("#idea #todo");
        expect(wrapper.emitted("change")?.at(-1)).toEqual([["idea", "todo"]]);

        wrapper.unmount();
    });

    it("opens the suggestions on the first typed character", async () => {
        const wrapper = mount(TagInput, { attachTo: document.body });

        await wrapper.get("input").setValue("t");

        expect(document.querySelector('[role="listbox"]')).not.toBeNull();
        await vi.waitFor(() => expect(options().length).toBeGreaterThan(0));

        wrapper.unmount();
    });

    it("turns the typed text into a tag on space and keeps focus", async () => {
        const wrapper = mount(TagInput, {
            props: { commitOnSeparator: true },
            attachTo: document.body,
        });
        const input = wrapper.get("input");
        input.element.focus();

        await input.setValue("work ");

        expect(wrapper.emitted("change")).toEqual([[["work"]]]);
        expect(input.element.value).toBe("");
        expect(document.activeElement).toBe(input.element);

        await input.setValue("idea,next");

        expect(wrapper.emitted("change")?.at(-1)).toEqual([["idea"]]);
        expect(input.element.value).toBe("next");

        wrapper.unmount();
    });

    it("keeps focus when a suggestion is picked", async () => {
        const wrapper = mount(TagInput, {
            props: { commitOnSeparator: true },
            attachTo: document.body,
        });
        const input = wrapper.get("input");
        input.element.focus();

        await input.setValue("rea");
        await vi.waitFor(() => expect(options()).toHaveLength(1));

        const option = options()[0]!;
        const mousedown = new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
        });
        option.dispatchEvent(mousedown);
        option.click();

        expect(mousedown.defaultPrevented).toBe(true);
        expect(wrapper.emitted("change")).toEqual([[["reading"]]]);
        expect(input.element.value).toBe("");
        expect(document.activeElement).toBe(input.element);

        await input.setValue("to");
        await vi.waitFor(() => expect(options()).toHaveLength(1));
        await input.trigger("keydown", { key: "Enter" });

        expect(wrapper.emitted("change")?.at(-1)).toEqual([["todo"]]);
        expect(document.activeElement).toBe(input.element);

        wrapper.unmount();
    });

    it("keeps the same focused field when the chips change", async () => {
        const wrapper = mount(TagChipsInput, {
            props: { tags: ["go"] },
            attachTo: document.body,
        });
        const input = wrapper.get("input");
        input.element.focus();

        await input.setValue("work ");
        const [tags] = wrapper.emitted<[string[]]>("change")!.at(-1)!;
        expect(tags).toEqual(["go", "work"]);
        await wrapper.setProps({ tags });

        expect(wrapper.get("input").element).toBe(input.element);
        expect(document.activeElement).toBe(input.element);
        expect(wrapper.text()).toContain("#work");

        wrapper.unmount();
    });

    it("removes the last tag with Backspace in an empty field", async () => {
        const wrapper = mount(TagChipsInput, {
            props: { tags: ["go", "work"] },
            attachTo: document.body,
        });
        const input = wrapper.get("input");
        input.element.focus();

        await input.setValue("ab");
        await input.trigger("keydown", { key: "Backspace" });
        expect(wrapper.emitted("change")).toBeUndefined();

        await input.setValue("");
        await input.trigger("keydown", { key: "Backspace" });
        expect(wrapper.emitted<[string[]]>("change")!.at(-1)).toEqual([["go"]]);
        await wrapper.setProps({ tags: ["go"] });
        await input.trigger("keydown", { key: "Backspace" });
        expect(wrapper.emitted<[string[]]>("change")!.at(-1)).toEqual([[]]);
        expect(document.activeElement).toBe(input.element);

        wrapper.unmount();
    });

    it("fills the rest of the row and focuses when the row is clicked", async () => {
        const wrapper = mount(TagChipsInput, {
            props: { tags: ["go"] },
            attachTo: document.body,
        });
        const field = wrapper.findComponent(TagInput);
        expect(field.classes()).toContain("grow");
        expect(field.classes()).not.toContain("max-w-xs");

        await wrapper.trigger("click");
        expect(document.activeElement).toBe(wrapper.get("input").element);

        wrapper.unmount();
    });

    it("leaves tags that are already added out of the suggestions", async () => {
        const chips = mount(TagChipsInput, {
            props: { tags: ["todo"] },
            attachTo: document.body,
        });
        await chips.get("input").setValue("o");
        await vi.waitFor(() =>
            expect(options().map((o) => o.textContent?.trim())).toEqual([
                "#go",
            ]),
        );
        chips.unmount();

        const search = mount(TagInput, { attachTo: document.body });
        const input = search.get("input");
        await input.setValue("#go #o");
        input.element.setSelectionRange(6, 6);
        await input.trigger("keyup", { key: "o" });
        await vi.waitFor(() =>
            expect(options().map((o) => o.textContent?.trim())).toEqual([
                "#todo",
            ]),
        );
        search.unmount();
    });
});
