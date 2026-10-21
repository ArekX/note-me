import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ErrorStatusPage from "./ErrorStatusPage.vue";
import NotFoundPage from "./NotFoundPage.vue";

vi.mock("vue-router", () => ({
    useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
    RouterLink: { template: "<a><slot /></a>" },
}));

describe("error pages", () => {
    it("shows the permission denied page with its message box", () => {
        const wrapper = mount(ErrorStatusPage, { props: { status: "403" } });
        expect(wrapper.text()).toContain("403");
        expect(wrapper.text()).toContain("Permission Denied");
        expect(wrapper.find("[data-test=error-message]").text()).toContain(
            "You do not have permission",
        );
        expect(wrapper.text()).toContain("Go back");
    });

    it("shows the internal server error page", () => {
        const wrapper = mount(ErrorStatusPage, { props: { status: "500" } });
        expect(wrapper.text()).toContain("Internal Server Error");
        expect(wrapper.find("[data-test=error-message]").exists()).toBe(true);
    });

    it("keeps the 404 page without a message box", () => {
        const wrapper = mount(NotFoundPage);
        expect(wrapper.text()).toContain("Page not found");
        expect(wrapper.text()).toContain(
            "The page you were looking for doesn't exist.",
        );
        expect(wrapper.find("[data-test=error-message]").exists()).toBe(false);
    });
});
