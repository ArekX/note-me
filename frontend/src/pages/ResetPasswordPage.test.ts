import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl, mockSessionPayload } from "@/test/mock-backend";
import ResetPasswordPage from "./ResetPasswordPage.vue";

const push = vi.fn();
const query: Record<string, string> = {};
vi.mock("vue-router", () => ({
    useRoute: () => ({ name: "reset-password", query }),
    useRouter: () => ({ push }),
    RouterLink: { template: "<a><slot /></a>" },
}));

const changePassword = async () => {
    const wrapper = mount(ResetPasswordPage);
    const inputs = wrapper.findAll("input[type=password]");
    await inputs[0]!.setValue("old-password");
    await inputs[1]!.setValue("new-password");
    await inputs[2]!.setValue("new-password");
    await wrapper
        .findAll("button")
        .find((b) => b.text() === "Change Password")!
        .trigger("click");
    await flushPromises();
};

describe("ResetPasswordPage", () => {
    beforeEach(() => {
        push.mockClear();
        delete query.redirect;
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify(mockSessionPayload(mockControl.state)),
                        { headers: { "Content-Type": "application/json" } },
                    ),
            ),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("goes back to the page that sent the user here", async () => {
        query.redirect = "/oauth/authorize?client_id=abc&state=xyz";
        await changePassword();
        expect(push).toHaveBeenCalledWith(
            "/oauth/authorize?client_id=abc&state=xyz",
        );
    });

    it("goes to the dashboard without a redirect on this site", async () => {
        query.redirect = "https://evil.example/";
        await changePassword();
        expect(push).toHaveBeenCalledWith({ name: "dashboard" });
    });
});
