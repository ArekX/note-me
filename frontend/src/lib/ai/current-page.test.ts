import { describe, expect, it } from "vitest";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { currentPage } from "./current-page";

const route = (name: string | undefined, params: Record<string, string> = {}) =>
    ({ name, params }) as unknown as RouteLocationNormalizedLoaded;

describe("currentPage", () => {
    it("names the route and the note in it", () => {
        expect(currentPage(route("note-view", { id: "12" }))).toEqual({
            name: "note-view",
            note_id: 12,
        });
        expect(currentPage(route("note-shared", { id: "40" }))).toEqual({
            name: "note-shared",
            note_id: 40,
        });
        expect(currentPage(route("settings-ai"))).toEqual({
            name: "settings-ai",
            note_id: null,
        });
        expect(currentPage(route("error", { status: "404" }))).toEqual({
            name: "error",
            note_id: null,
        });
        expect(currentPage(route(undefined, { id: "x" }))).toEqual({
            name: "",
            note_id: null,
        });
    });
});
