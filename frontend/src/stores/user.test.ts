import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserStore, type SessionResponse } from "./user";

const startAuthentication = vi.hoisted(() => vi.fn());
vi.mock("@simplewebauthn/browser", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@simplewebauthn/browser")>()),
    startAuthentication,
}));

const session: SessionResponse = {
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
    permissions: ["canUpdateUsers"],
    required_steps: [],
};

const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

describe("user store", () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("logs in through /api/login", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
        const store = useUserStore();

        await store.login({ username: "admin", password: "password" });

        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe("/api/login");
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({
            username: "admin",
            password: "password",
        });
        expect(store.isLoggedIn).toBe(true);
        expect(store.user?.username).toBe("admin");
    });

    it("surfaces the server error message on a failed login", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse(401, { error: "Invalid username or password." }),
        );
        const store = useUserStore();

        await expect(
            store.login({ username: "admin", password: "wrong-password" }),
        ).rejects.toMatchObject({
            status: 401,
            message: "Invalid username or password.",
        });
        expect(store.isLoggedIn).toBe(false);
    });

    it("restores the session from /api/session", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
        const store = useUserStore();

        await store.restoreSession();

        expect(fetchMock.mock.calls[0]![0]).toBe("/api/session");
        expect(store.isLoaded).toBe(true);
        expect(store.user?.id).toBe(1);
    });

    it("treats a 401 from /api/session as logged out", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse(401, { error: "Unauthorized" }),
        );
        const store = useUserStore();

        await store.restoreSession();

        expect(store.isLoaded).toBe(true);
        expect(store.isLoggedIn).toBe(false);
    });

    it("logs out through /api/logout and forgets the session even on failure", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
        const store = useUserStore();
        await store.restoreSession();
        fetchMock.mockResolvedValueOnce(
            jsonResponse(401, { error: "Unauthorized" }),
        );

        await expect(store.logout()).rejects.toMatchObject({ status: 401 });

        expect(fetchMock.mock.calls[1]![0]).toBe("/api/logout");
        expect(store.isLoggedIn).toBe(false);
    });

    it("fetches /api/session only once for concurrent and later calls", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
        const store = useUserStore();

        await Promise.all([store.restoreSession(), store.restoreSession()]);
        await store.restoreSession();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("uses the permissions sent by the server", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
        const store = useUserStore();
        await store.restoreSession();

        expect(store.can("canUpdateUsers")).toBe(true);
        expect(store.can("canManageBackups")).toBe(false);
        expect(store.canAccessSettings).toBe(true);
    });

    it("applies the session returned by /api/process-step", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse(200, {
                ...session,
                user: { ...session.user, is_password_reset_required: true },
                required_steps: ["password_reset"],
            }),
        );
        const store = useUserStore();
        await store.restoreSession();
        expect(store.requiredSteps).toEqual(["password_reset"]);

        fetchMock.mockResolvedValueOnce(jsonResponse(200, session));
        const request = {
            step: "password_reset",
            action: "change",
            data: { old_password: "admin" },
        };
        await store.processStep(request);

        const [url, init] = fetchMock.mock.calls[1]!;
        expect(url).toBe("/api/process-step");
        expect(JSON.parse(init?.body as string)).toEqual(request);
        expect(store.requiredSteps).toEqual([]);
        expect(store.user?.is_password_reset_required).toBe(false);
    });

    describe("passkey login", () => {
        const options = { challenge: "Y2hhbGxlbmdl", rpId: "localhost" };
        const assertion = { id: "credential", response: {} };

        it("signs in with the passkey the browser returns", async () => {
            fetchMock
                .mockResolvedValueOnce(
                    jsonResponse(200, { request_id: "req-1", options }),
                )
                .mockResolvedValueOnce(jsonResponse(200, session));
            startAuthentication.mockResolvedValueOnce(assertion);
            const store = useUserStore();

            expect(await store.loginWithPasskey()).toBe(true);

            expect(fetchMock.mock.calls[0]![0]).toBe(
                "/api/login/passkey/options",
            );
            expect(startAuthentication).toHaveBeenCalledWith({
                optionsJSON: options,
            });
            const [url, init] = fetchMock.mock.calls[1]!;
            expect(url).toBe("/api/login/passkey");
            expect(JSON.parse(init?.body as string)).toEqual({
                request_id: "req-1",
                response: assertion,
            });
            expect(store.user?.username).toBe("admin");
        });

        it("stops quietly when the prompt is closed", async () => {
            fetchMock.mockResolvedValueOnce(
                jsonResponse(200, { request_id: "req-1", options }),
            );
            startAuthentication.mockRejectedValueOnce(
                Object.assign(new Error("closed"), { name: "NotAllowedError" }),
            );
            const store = useUserStore();

            expect(await store.loginWithPasskey()).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(store.isLoggedIn).toBe(false);
        });

        it("surfaces the server message when verification fails", async () => {
            fetchMock
                .mockResolvedValueOnce(
                    jsonResponse(200, { request_id: "req-1", options }),
                )
                .mockResolvedValueOnce(
                    jsonResponse(401, {
                        error: "Could not verify your passkey, make sure it is registered to your account.",
                    }),
                );
            startAuthentication.mockResolvedValueOnce(assertion);
            const store = useUserStore();

            await expect(store.loginWithPasskey()).rejects.toMatchObject({
                status: 401,
                message:
                    "Could not verify your passkey, make sure it is registered to your account.",
            });
            expect(store.isLoggedIn).toBe(false);
        });
    });
});
