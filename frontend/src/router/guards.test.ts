import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalized } from "vue-router";
import { authGuard } from "./guards";
import { useUserStore, type SessionResponse } from "@/stores/user";

const session = (
    overrides: Partial<SessionResponse> = {},
): SessionResponse => ({
    user: {
        id: 1,
        name: "Administrator",
        username: "admin",
        role: "admin",
        timezone: "Europe/Belgrade",
        onboarding_state: {},
        preferred_editor: "rich",
        profile_picture: null,
        is_password_reset_required: false,
        created_at: 100,
        updated_at: 100,
    },
    permissions: [],
    required_steps: [],
    ...overrides,
});

const route = (
    name: string,
    meta: RouteLocationNormalized["meta"] = { requiresAuth: true },
) => ({ name, meta, fullPath: `/${name}` }) as RouteLocationNormalized;

const runGuard = (to: RouteLocationNormalized) =>
    (authGuard as (to: RouteLocationNormalized) => unknown).call(undefined, to);

describe("authGuard", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    it("sends a user with a pending step to that step's page", async () => {
        useUserStore().setSession(
            session({ required_steps: ["password_reset"] }),
        );

        expect(await runGuard(route("dashboard"))).toEqual({
            name: "reset-password",
        });
        expect(await runGuard(route("reset-password"))).toBe(true);
        expect(await runGuard(route("logout"))).toBe(true);
    });

    it("comes back to a page that asks for it after the pending step", async () => {
        useUserStore().setSession(
            session({ required_steps: ["password_reset"] }),
        );

        expect(
            await runGuard(
                route("oauth-authorize", {
                    requiresAuth: true,
                    returnAfterSteps: true,
                }),
            ),
        ).toEqual({
            name: "reset-password",
            query: { redirect: "/oauth-authorize" },
        });
    });

    it("sends a user without pending steps away from step pages", async () => {
        useUserStore().setSession(session());

        expect(await runGuard(route("reset-password"))).toEqual({
            name: "dashboard",
        });
        expect(await runGuard(route("dashboard"))).toBe(true);
    });

    it("redirects guests to the login page", async () => {
        useUserStore().setSession(null);

        expect(await runGuard(route("dashboard"))).toEqual({
            name: "login",
            query: { redirect: "/dashboard" },
        });
    });

    it("sends a settings tab without its permission to the first allowed tab", async () => {
        const settings = { requiresAuth: true, requiresSettingsAccess: true };
        useUserStore().setSession(
            session({ permissions: ["canReadTags", "canUpdateTags"] }),
        );

        expect(await runGuard(route("settings", settings))).toEqual({
            name: "settings-tags",
        });
        expect(await runGuard(route("settings-users", settings))).toEqual({
            name: "settings-tags",
        });
        expect(await runGuard(route("settings-tags", settings))).toBe(true);
    });

    it("keeps users without settings permissions out of settings", async () => {
        useUserStore().setSession(session({ permissions: ["canReadTags"] }));

        expect(
            await runGuard(
                route("settings-tags", {
                    requiresAuth: true,
                    requiresSettingsAccess: true,
                }),
            ),
        ).toEqual({ name: "dashboard" });
    });

    it("shows the error page without loading the session", async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
        vi.stubGlobal("fetch", fetchMock);

        expect(await runGuard(route("error", {}))).toBe(true);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
