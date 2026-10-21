import type { RouteLocationNormalizedLoaded } from "vue-router";
import type { AiOpenPage } from "@/types/records";

// The server names the page and looks up the note's title itself.
export const currentPage = (
    route: RouteLocationNormalizedLoaded,
): AiOpenPage => {
    const id = Number(route.params.id);
    return {
        name: typeof route.name === "string" ? route.name : "",
        note_id: Number.isInteger(id) && id > 0 ? id : null,
    };
};
