import { computed, shallowRef } from "vue";
import type { RouteLocationRaw } from "vue-router";

export const TOP_BAR_ACTIONS_ID = "top-bar-actions";

export interface Crumb {
    label: string;
    to?: RouteLocationRaw;
    onClick?: () => void;
    icon?: string;
}

const crumbs = shallowRef<Crumb[] | null>(null);
let owner = 0;

// A page shows its own breadcrumb instead of the one from the route; the
// returned function removes it again unless a later page replaced it.
export const useTopBar = () => ({
    crumbs: computed(() => crumbs.value),
    setCrumbs: (next: Crumb[]) => {
        const id = ++owner;
        crumbs.value = next;
        return () => {
            if (owner === id) {
                crumbs.value = null;
            }
        };
    },
});
