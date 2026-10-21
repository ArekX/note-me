import { describe, expect, it } from "vitest";
import { mcpClientSchema, type NewMcpClientRequest } from "./mcp";
import { validateSchema } from "./index";

const issuesOf = async (data: Partial<NewMcpClientRequest>) =>
    (
        (await validateSchema(mcpClientSchema, {
            name: "Claude",
            kind: "oauth",
            is_read_only: false,
            redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
            ...data,
        })) ?? []
    ).map(({ path, message }) => [path.join("."), message]);

describe("mcpClientSchema", () => {
    it("accepts https and loopback http redirect URIs", async () => {
        expect(
            await issuesOf({
                redirect_uris: [
                    "https://chatgpt.com/connector_platform_oauth_redirect",
                    "http://127.0.0.1:33418/callback",
                    "http://[::1]/callback",
                    "http://localhost:6274/oauth/callback",
                ],
            }),
        ).toEqual([]);
    });

    it("checks the name", async () => {
        expect(await issuesOf({ name: "   " })).toEqual([
            ["name", "Name must have at least one character"],
        ]);
        expect(await issuesOf({ name: "a".repeat(256) })).toEqual([
            ["name", "Name must have at most 255 characters"],
        ]);
    });

    it("checks redirect URIs of OAuth clients only", async () => {
        expect(await issuesOf({ redirect_uris: [] })).toEqual([
            ["redirect_uris", "Add at least one redirect URI."],
        ]);
        expect(
            await issuesOf({
                redirect_uris: [
                    "http://example.com/callback",
                    "ftp://localhost/callback",
                    "not a url",
                ],
            }),
        ).toEqual([
            [
                "redirect_uris",
                "Redirect URI must use https, or http on localhost.",
            ],
        ]);
        expect(
            await issuesOf({
                redirect_uris: [`https://example.com/${"a".repeat(2048)}`],
            }),
        ).toEqual([
            ["redirect_uris", "Redirect URI must have at most 2048 characters"],
        ]);
        expect(
            await issuesOf({
                redirect_uris: Array.from(
                    { length: 11 },
                    (_, i) => `https://example.com/${i}`,
                ),
            }),
        ).toEqual([["redirect_uris", "At most 10 redirect URIs are allowed."]]);

        expect(await issuesOf({ kind: "token", redirect_uris: [] })).toEqual(
            [],
        );
    });
});
