import { IS_BROWSER } from "$fresh/runtime.ts";
import { Ref, useEffect } from "preact/hooks";

export const useWindowResize = <T extends Node>(
    itemRef: Ref<T>,
    onResized: (width: number, height: number) => void,
) => {
    useEffect(() => {
        if (!IS_BROWSER) {
            return;
        }

        const handleResize = () => onResized(innerWidth, innerHeight);

        addEventListener("resize", handleResize);

        return () => {
            removeEventListener("resize", handleResize);
        };
    }, [itemRef]);
};
