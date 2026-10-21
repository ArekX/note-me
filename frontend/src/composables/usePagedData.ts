import { ref, type Ref } from "vue";
import type { Paged } from "@/types/records";

export const usePagedData = <T>(load: () => unknown, perPage = 20) => {
    const results = ref([]) as Ref<T[]>;
    const page = ref(1);
    const total = ref(0);
    const currentPerPage = ref(perPage);

    const setPagedData = (data: Partial<Paged<T>>) => {
        results.value = data.results ?? results.value;
        currentPerPage.value = data.per_page ?? currentPerPage.value;
        total.value = data.total ?? total.value;
        page.value = data.page ?? page.value;
    };

    const changePage = (newPage: number) => {
        page.value = newPage;
        void load();
    };

    const loadFirstPage = () => {
        page.value = 1;
        return load();
    };

    return {
        results,
        page,
        total,
        perPage: currentPerPage,
        setPagedData,
        changePage,
        loadFirstPage,
    };
};
