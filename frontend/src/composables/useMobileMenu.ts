import { readonly, ref } from "vue";

export const MOBILE_MENU_CLOSE_DELAY_MS = 100;

const isMenuOpen = ref(false);

// touchend fires before click; closing at once would unmount the link before
// its click navigates.
const closeOnLinkClick = (event: Event) => {
    if (!(event.target instanceof Element) || !event.target.closest("a")) {
        return;
    }
    setTimeout(() => {
        isMenuOpen.value = false;
    }, MOBILE_MENU_CLOSE_DELAY_MS);
};

document.addEventListener("click", closeOnLinkClick);
document.addEventListener("touchend", closeOnLinkClick);

export const useMobileMenu = () => ({
    isMenuOpen: readonly(isMenuOpen),
    open: () => {
        isMenuOpen.value = true;
    },
    close: () => {
        isMenuOpen.value = false;
    },
    toggle: () => {
        isMenuOpen.value = !isMenuOpen.value;
    },
});
