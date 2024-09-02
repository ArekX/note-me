import { signal } from "@preact/signals";
import { IS_BROWSER } from "$fresh/runtime.ts";

export type ResponsiveSize = "sm" | "md" | "lg" | "xl" | "2xl";

const responsiveOrder = ["sm", "md", "lg", "xl", "2xl"];

const updateResponsiveSize = (): ResponsiveSize => {
    if (!IS_BROWSER) {
        return "md";
    }

    if (innerWidth < 768) {
        return "sm";
    } else if (
        innerWidth >= 768 && innerWidth < 1024
    ) {
        return "md";
    } else if (
        innerWidth >= 1024 && innerWidth < 1280
    ) {
        return "lg";
    } else if (
        innerWidth >= 1280 && innerWidth < 1536
    ) {
        return "xl";
    }
    return "2xl";
};

const size = signal<ResponsiveSize>(updateResponsiveSize());

if (IS_BROWSER) {
    const setResponsiveSize = () => size.value = updateResponsiveSize();
    addEventListener("resize", setResponsiveSize);
    setResponsiveSize();
}

export const useResponsiveQuery = () => {
    const between = (from: ResponsiveSize, to: ResponsiveSize) => {
        return min(from) && max(to);
    };

    const min = (from: ResponsiveSize) => {
        const fromIndex = responsiveOrder.indexOf(from);
        const sizeIndex = responsiveOrder.indexOf(size.value);

        return sizeIndex >= fromIndex;
    };

    const max = (to: ResponsiveSize) => {
        const toIndex = responsiveOrder.indexOf(to);
        const sizeIndex = responsiveOrder.indexOf(size.value);

        return sizeIndex <= toIndex;
    };

    const matches = (...target: ResponsiveSize[]) => {
        return target.includes(size.value);
    };

    const pick = <T>(map: Record<ResponsiveSize, T>, defaultValue: T) => {
        return map[size.value] ?? defaultValue;
    };

    const isMobile = () => max("sm");

    return {
        size,
        isMobile,
        between,
        min,
        max,
        pick,
        matches,
    };
};
