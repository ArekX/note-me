import { describe, expect, it } from "vitest";
import { sameSitePath } from "./redirect";
import { routes } from "@/router";
import { createMemoryHistory, createRouter } from "vue-router";

describe("sameSitePath", () => {
    it("keeps paths on this site", () => {
        expect(sameSitePath("/file/abc?download")).toBe("/file/abc?download");
        expect(sameSitePath("/app/note/1#top")).toBe("/app/note/1#top");
    });

    it("rejects absolute and protocol relative targets", () => {
        for (const value of [
            "https://evil.example",
            "//evil.example/file",
            "/\\evil.example",
            "\\\\evil.example",
            "javascript:alert(1)",
            "file/abc",
            "",
            undefined,
            ["/app"],
        ]) {
            expect(sameSitePath(value)).toBeNull();
        }
    });

    it("is read by the login page the server redirects to", () => {
        const router = createRouter({ history: createMemoryHistory(), routes });
        const target = router.resolve(
            "/?redirect=%2Ffile%2Fprivate-file%3Fdownload",
        );
        expect(target.name).toBe("login");
        expect(target.query.redirect).toBe("/file/private-file?download");
    });
});
