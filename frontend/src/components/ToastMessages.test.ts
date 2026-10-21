import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ToastMessages from "./ToastMessages.vue";
import { useToastStore } from "@/stores/toast";

describe("ToastMessages", () => {
    it("renders store messages and dismisses them", async () => {
        const toast = useToastStore();
        toast.addMessage({ type: "info", text: "hello" }, "a", 0);

        const wrapper = mount(ToastMessages);
        expect(wrapper.findAll("[data-test=toast]")).toHaveLength(1);

        await wrapper.get("button").trigger("click");
        expect(toast.messages).toHaveLength(0);
    });
});
