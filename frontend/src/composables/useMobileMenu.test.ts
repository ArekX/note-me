import { afterEach, describe, expect, it, vi } from "vitest";
import { MOBILE_MENU_CLOSE_DELAY_MS, useMobileMenu } from "./useMobileMenu";

describe("useMobileMenu", () => {
    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = "";
    });

    it("is shared between callers", () => {
        useMobileMenu().open();
        expect(useMobileMenu().isMenuOpen.value).toBe(true);
        useMobileMenu().toggle();
        expect(useMobileMenu().isMenuOpen.value).toBe(false);
    });

    it("closes after a click inside a link", () => {
        vi.useFakeTimers();
        document.body.innerHTML = `<a href="#"><i id="icon"></i></a><span id="text"></span>`;
        const menu = useMobileMenu();
        menu.open();

        document.getElementById("text")!.click();
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DELAY_MS);
        expect(menu.isMenuOpen.value).toBe(true);

        document.getElementById("icon")!.click();
        vi.advanceTimersByTime(MOBILE_MENU_CLOSE_DELAY_MS - 1);
        expect(menu.isMenuOpen.value).toBe(true);
        vi.advanceTimersByTime(1);
        expect(menu.isMenuOpen.value).toBe(false);
    });
});
