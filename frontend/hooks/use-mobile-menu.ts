import { signal } from "@preact/signals";

const isMenuOpen = signal(false);

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
