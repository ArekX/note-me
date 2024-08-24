import { signal } from "@preact/signals";
import { IS_BROWSER } from "$fresh/runtime.ts";

const isMenuOpen = signal(false);

if (IS_BROWSER) {
    const handleListener = (event: Event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "A") {
            setTimeout(() => {
                if (isMenuOpen.value) {
                    isMenuOpen.value = false;
                }
            }, 100);
        }
    };

    addEventListener("DOMContentLoaded", () => {
        document.addEventListener("click", handleListener);
        document.addEventListener("touchend", handleListener);
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
