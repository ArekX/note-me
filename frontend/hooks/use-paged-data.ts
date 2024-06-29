import { useSignal } from "@preact/signals";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

interface PagedDataOptions<T> {
    initialResults?: T[];
    initialPage?: number;
    initialTotal?: number;
    initialPerPage?: number;
}

export const usePagedData = <T>({
    initialResults = [],
    initialPage = 1,
    initialPerPage = 20,
    initialTotal = 0,
}: PagedDataOptions<T> = {}) => {
    const results = useSignal<T[]>(initialResults);
    const page = useSignal(initialPage);
    const total = useSignal(initialTotal);
    const perPage = useSignal(initialPerPage);

    const setPagedData = (data: Partial<Paged<T>>) => {
        results.value = data.results ?? results.value;
        perPage.value = data.per_page ?? perPage.value;
        total.value = data.total ?? total.value;
        page.value = data.page ?? page.value;
    };

    const resetPage = () => page.value = 1;

    return {
        results,
        page,
        total,
        perPage,
        setPagedData,
        resetPage,
    };
};
