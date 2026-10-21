import { readonly, ref } from "vue";

export type ResponsiveSize = "sm" | "md" | "lg" | "xl" | "2xl";

const responsiveOrder: ResponsiveSize[] = ["sm", "md", "lg", "xl", "2xl"];

// Tailwind breakpoints: md 768, lg 1024, xl 1280, 2xl 1536.
export const sizeForWidth = (width: number): ResponsiveSize => {
    if (width < 768) {
        return "sm";
    }
    if (width < 1024) {
        return "md";
    }
    if (width < 1280) {
        return "lg";
    }
    if (width < 1536) {
        return "xl";
    }
    return "2xl";
};

const size = ref<ResponsiveSize>(sizeForWidth(window.innerWidth));

window.addEventListener("resize", () => {
    size.value = sizeForWidth(window.innerWidth);
});

export const useResponsiveQuery = () => {
    const position = (target: ResponsiveSize) =>
        responsiveOrder.indexOf(target);

    const min = (from: ResponsiveSize) =>
        position(size.value) >= position(from);

    const max = (to: ResponsiveSize) => position(size.value) <= position(to);

    const between = (from: ResponsiveSize, to: ResponsiveSize) =>
        min(from) && max(to);

    const matches = (...targets: ResponsiveSize[]) =>
        targets.includes(size.value);

    const pick = <T>(
        map: Partial<Record<ResponsiveSize, T>>,
        defaultValue: T,
    ): T => map[size.value] ?? defaultValue;

    const isMobile = () => max("sm");

    return { size: readonly(size), isMobile, between, min, max, pick, matches };
};
