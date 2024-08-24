import { signal } from "@preact/signals";
import { IS_BROWSER } from "$fresh/runtime.ts";

const isMenuOpen = signal(false);

if (IS_BROWSER) {
    const closeMenu = () => {
        if (isMenuOpen.value) {
            isMenuOpen.value = false;
        }
    };

    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "A") {
            closeMenu();
        }
    });
}

export const useMobileMenu = () => {
    const open = () => isMenuOpen.value = true;
    const close = () => isMenuOpen.value = false;

    const toggle = () => isMenuOpen.value = !isMenuOpen.value;

    return {
        isMenuOpen,
        toggle,
        open,
        close,
    };
};