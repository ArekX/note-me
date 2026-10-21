import { describe, expect, it } from "vitest";
import { getWallpaperForMonth } from "./wallpaper";

describe("wallpaper", () => {
    it("maps months to seasons", () => {
        expect(getWallpaperForMonth(1)).toBe("/wallpapers/winter2.jpg");
        expect(getWallpaperForMonth(7)).toBe("/wallpapers/summer2.jpg");
        expect(getWallpaperForMonth(12)).toBe("/wallpapers/winter1.jpg");
    });

    it("falls back for invalid months", () => {
        expect(getWallpaperForMonth(13)).toBe("/wallpapers/winter2.jpg");
    });
});
