import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Logo from "./Logo.vue";

describe("Logo", () => {
    it("renders the white variant", () => {
        const wrapper = mount(Logo, { props: { white: true, size: 64 } });
        const img = wrapper.get("img");
        expect(img.attributes("src")).toBe("/logo-white.svg");
        expect(img.attributes("width")).toBe("64");
    });

    it("defaults to the dark logo", () => {
        const wrapper = mount(Logo);
        expect(wrapper.get("img").attributes("src")).toBe("/logo.svg");
    });
});
