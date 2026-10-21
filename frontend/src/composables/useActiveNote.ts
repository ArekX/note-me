import { useRoute } from "vue-router";

export const useActiveNote = () => {
    const route = useRoute();

    return (id: number | null, shared = false) =>
        (shared
            ? route.name === "note-shared"
            : route.name === "note-view" || route.name === "note-edit") &&
        Number(route.params.id) === id;
};
