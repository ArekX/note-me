import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import MermaidDiagram from "./MermaidDiagram.vue";

const render = vi.fn();
const initialize = vi.fn();
vi.mock("mermaid", () => ({ default: { initialize, render } }));

describe("MermaidDiagram", () => {
    it("initialises mermaid in strict mode without HTML labels", async () => {
        const code = 'graph TD\n  a["<img src=x onerror=alert(1)>"]';
        render.mockResolvedValueOnce({
            svg: "<svg><text>&lt;img src=x onerror=alert(1)&gt;</text></svg>",
        });
        const wrapper = mount(MermaidDiagram, { props: { code } });
        await flushPromises();

        expect(initialize).toHaveBeenCalledTimes(1);
        expect(initialize.mock.calls[0]![0]).toMatchObject({
            securityLevel: "strict",
            htmlLabels: false,
            flowchart: { htmlLabels: false },
            class: { htmlLabels: false },
        });
        expect(render).toHaveBeenLastCalledWith(expect.any(String), code);
        expect(wrapper.find("img").exists()).toBe(false);
        expect(wrapper.find("foreignObject").exists()).toBe(false);
        expect(wrapper.find("script").exists()).toBe(false);
        expect(wrapper.text()).toBe("<img src=x onerror=alert(1)>");
    });

    it("shows the rendered SVG and keeps the source when rendering fails", async () => {
        render.mockResolvedValueOnce({ svg: "<svg><g></g></svg>" });
        const wrapper = mount(MermaidDiagram, { props: { code: "graph TD" } });
        expect(wrapper.text()).toBe("graph TD");
        await flushPromises();
        expect(wrapper.find("svg").exists()).toBe(true);

        render.mockRejectedValueOnce(new Error("Parse error"));
        await wrapper.setProps({ code: "graph ??" });
        await flushPromises();
        expect(wrapper.find("svg").exists()).toBe(false);
        expect(wrapper.text()).toBe("graph ??");
    });
});
