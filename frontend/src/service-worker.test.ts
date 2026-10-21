import { describe, expect, it, vi } from "vitest";
import source from "./service-worker.js?raw";

const origin = "https://notes.test";

type FakeRequest = { url: string; method: string; mode: string };

const load = () => {
    const listeners: Record<string, (event: unknown) => void> = {};
    const stored = new Map<string, Response>();
    const key = (request: string | FakeRequest) =>
        new URL(typeof request === "string" ? request : request.url, origin)
            .href;
    const cache = {
        match: async (request: string | FakeRequest) =>
            stored.get(key(request))?.clone(),
        put: async (request: string | FakeRequest, response: Response) => {
            stored.set(key(request), response);
        },
    };
    const caches = {
        open: async () => cache,
        match: cache.match,
    };
    const fetchMock = vi.fn<(request: FakeRequest) => Promise<Response>>();
    const self = {
        location: { origin },
        addEventListener: (type: string, fn: (event: unknown) => void) => {
            listeners[type] = fn;
        },
    };
    new Function("self", "caches", "fetch", source)(self, caches, fetchMock);

    const request = (path: string, init: Partial<FakeRequest> = {}) => {
        let response: Promise<Response> | undefined;
        listeners.fetch!({
            request: {
                url: new URL(path, origin).href,
                method: "GET",
                mode: "cors",
                ...init,
            },
            respondWith: (value: Promise<Response>) => {
                response = value;
            },
            waitUntil: () => undefined,
        });
        return response;
    };

    return { request, fetchMock, stored };
};

const asset = (body: string, type = "text/javascript") =>
    new Response(body, { headers: { "Content-Type": type } });

describe("service worker", () => {
    it("leaves user data, downloads and other origins to the network", () => {
        const { request, fetchMock } = load();

        expect(request("/api/session")).toBeUndefined();
        expect(request("/api/data-export/1", { mode: "navigate" })).toBe(
            undefined,
        );
        expect(request("/file/abc")).toBeUndefined();
        expect(request("/ws")).toBeUndefined();
        expect(request("/assets/app.js", { method: "POST" })).toBeUndefined();
        expect(request("https://other.test/assets/app.js")).toBeUndefined();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("answers build assets from the cache after the first load", async () => {
        const { request, fetchMock } = load();
        fetchMock.mockResolvedValueOnce(asset("app"));

        expect(await (await request("/assets/app.js"))!.text()).toBe("app");
        expect(await (await request("/assets/app.js"))!.text()).toBe("app");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does not cache the index page served for a missing asset", async () => {
        const { request, stored, fetchMock } = load();
        fetchMock.mockResolvedValue(asset("<html>", "text/html"));

        await request("/assets/old.js");

        expect(stored.size).toBe(0);
    });

    it("loads pages from the network and falls back to the last one offline", async () => {
        const { request, fetchMock } = load();
        fetchMock.mockResolvedValueOnce(asset("<html>", "text/html"));
        expect(
            await (await request("/app", { mode: "navigate" }))!.text(),
        ).toBe("<html>");

        fetchMock.mockRejectedValueOnce(new TypeError("offline"));
        expect(
            await (await request("/app/note/view-1", {
                mode: "navigate",
            }))!.text(),
        ).toBe("<html>");
    });
});
