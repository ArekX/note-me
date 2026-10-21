import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { routes } from "@/router";
import { authGuard } from "@/router/guards";
import { mockControl, mockSessionPayload } from "@/test/mock-backend";

const query =
    "response_type=code&client_id=mock-client-id&redirect_uri=https%3A%2F%2Fclaude.ai%2Fapi%2Fmcp%2Fauth_callback&code_challenge=abc&code_challenge_method=S256&state=xyz";
const consentPath = `/oauth/authorize?${query}`;
const redirectUrl =
    "https://claude.ai/api/mcp/auth_callback?code=c0de&state=xyz";

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

let signedIn = true;
let consentResponse: () => Response;
const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url === "/api/session") {
        return signedIn
            ? json(200, mockSessionPayload(mockControl.state))
            : json(401, { error: "Unauthorized" });
    }
    if (url === "/api/login") {
        signedIn = true;
        return json(200, mockSessionPayload(mockControl.state));
    }
    if (url === `/api/oauth/consent?${query}`) {
        return consentResponse();
    }
    if (url === "/api/oauth/consent" && init?.method === "POST") {
        const { allow } = JSON.parse(init.body as string) as {
            allow: boolean;
        };
        return json(200, {
            redirect_url: allow
                ? redirectUrl
                : "https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz",
        });
    }
    return json(404, { error: "Not found" });
});

const Root = defineComponent({ render: () => h(RouterView) });

const mountAt = async (path: string) => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    router.beforeEach(authGuard);
    await router.push(path);
    await router.isReady();
    const wrapper = mount(Root, {
        global: { plugins: [router] },
        attachTo: document.body,
    });
    await flushPromises();
    return { router, wrapper };
};

const buttonTexts = (wrapper: VueWrapper) =>
    wrapper.findAll("button").map((b) => b.text());

const clickButton = async (wrapper: VueWrapper, text: string) => {
    await wrapper
        .findAll("button")
        .find((b) => b.text() === text)!
        .trigger("click");
    await flushPromises();
};

describe("OAuthAuthorizePage", () => {
    const assign = vi.fn();

    beforeEach(() => {
        signedIn = true;
        consentResponse = () =>
            json(200, {
                client_name: "claude.ai",
                is_read_only: false,
                user: { name: "Administrator", username: "admin" },
            });
        fetchMock.mockClear();
        assign.mockClear();
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("location", { origin: location.origin, assign });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    const consentPosts = () =>
        fetchMock.mock.calls
            .filter(([url]) => url === "/api/oauth/consent")
            .map(([, init]) => JSON.parse(init!.body as string));

    it("asks for consent and sends the answer on Allow", async () => {
        const { wrapper } = await mountAt(consentPath);

        await vi.waitFor(() =>
            expect(wrapper.text()).toContain(
                "claude.ai wants to access your NoteMe account",
            ),
        );
        expect(wrapper.text()).toContain("Signed in as Administrator (admin)");
        expect(wrapper.text()).toContain("Full access");
        expect(wrapper.text()).toContain("Protected notes are never available");

        await clickButton(wrapper, "Allow");

        expect(consentPosts()).toEqual([{ query, allow: true }]);
        expect(assign).toHaveBeenCalledWith(redirectUrl);
    });

    it("sends the denial on Deny", async () => {
        consentResponse = () =>
            json(200, {
                client_name: "ChatGPT",
                is_read_only: true,
                user: { name: "Administrator", username: "admin" },
            });
        const { wrapper } = await mountAt(consentPath);
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Read only access"),
        );

        await clickButton(wrapper, "Deny");

        expect(consentPosts()).toEqual([{ query, allow: false }]);
        expect(assign).toHaveBeenCalledWith(
            "https://claude.ai/api/mcp/auth_callback?error=access_denied&state=xyz",
        );
    });

    it("shows an error of the request without the buttons", async () => {
        consentResponse = () =>
            json(400, { error: "The authorization request has expired." });
        const { wrapper } = await mountAt(consentPath);

        await vi.waitFor(() =>
            expect(wrapper.text()).toContain(
                "The authorization request has expired.",
            ),
        );
        expect(buttonTexts(wrapper)).not.toContain("Allow");
        expect(buttonTexts(wrapper)).not.toContain("Deny");
    });

    it("sends a signed out user through login and back", async () => {
        signedIn = false;
        const { router, wrapper } = await mountAt(consentPath);

        expect(router.currentRoute.value.name).toBe("login");
        expect(router.currentRoute.value.query.redirect).toBe(consentPath);

        await wrapper.get("input[name=username]").setValue("admin");
        await wrapper.get("input[name=password]").setValue("admin");
        await wrapper.get("form").trigger("submit");

        await vi.waitFor(() =>
            expect(router.currentRoute.value.fullPath).toBe(consentPath),
        );
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain(
                "claude.ai wants to access your NoteMe account",
            ),
        );
    });
});
