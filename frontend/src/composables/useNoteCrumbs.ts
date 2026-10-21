import { onBeforeUnmount, watch } from "vue";
import type { Crumb } from "./useTopBar";
import { useSidebar } from "./useSidebar";
import { useTopBar } from "./useTopBar";
import { useSearchStore } from "@/stores/search";
import { useTreeStore } from "@/stores/tree";

export interface NoteCrumbSource {
    groupId: number | null;
    groupName: string | null;
    tail: Crumb[];
}

export const useGroupCrumbs = () => {
    const treeStore = useTreeStore();
    const search = useSearchStore();
    const sidebar = useSidebar();

    return (groupId: number | null, groupName: string | null): Crumb[] =>
        treeStore.groupPath(groupId, groupName).map((group) => ({
            label: group.name,
            icon: "folder",
            onClick: () => {
                sidebar.show("notes");
                search.setGroup(group);
            },
        }));
};

// Group path, then the page's own crumbs; kept in the top bar while the
// page is shown.
export const useNoteCrumbs = (source: () => NoteCrumbSource) => {
    const topBar = useTopBar();
    const groupCrumbs = useGroupCrumbs();
    let clear = () => {};

    watch(
        () => {
            const { groupId, groupName, tail } = source();
            return [...groupCrumbs(groupId, groupName), ...tail];
        },
        (crumbs) => {
            clear();
            clear = topBar.setCrumbs(crumbs);
        },
        { immediate: true, deep: true },
    );
    onBeforeUnmount(() => clear());
};
