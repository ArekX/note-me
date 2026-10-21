import { ref, type Ref } from "vue";
import { useLoader } from "./useLoader";

interface LoadMoreOptions<T> {
    onLoadMore: (lastRecord: T | null) => Promise<T[]>;
    limit: number;
}

export const useLoadMore = <T>({ onLoadMore, limit }: LoadMoreOptions<T>) => {
    const records = ref([]) as Ref<T[]>;
    const hasMore = ref(true);
    const loader = useLoader();

    // A load still running when reset() is called belongs to the old list;
    // its records are dropped and it does not block loading the new one.
    let generation = 0;
    let loadingGeneration: number | null = null;

    const loadMore = async () => {
        if (loadingGeneration === generation || !hasMore.value) {
            return;
        }

        const current = generation;
        loadingGeneration = current;
        loader.start();
        try {
            const newRecords = await onLoadMore(
                records.value[records.value.length - 1] ?? null,
            );
            if (current === generation) {
                records.value = [...records.value, ...newRecords];
                hasMore.value = newRecords.length >= limit;
            }
        } finally {
            if (loadingGeneration === current) {
                loadingGeneration = null;
                loader.stop();
            }
        }
    };

    const reset = () => {
        generation++;
        loadingGeneration = null;
        loader.stop();
        records.value = [];
        hasMore.value = true;
    };

    const reload = () => {
        reset();
        return loadMore();
    };

    return { records, hasMore, loader, loadMore, reset, reload };
};

export type LoadMoreList<T> = ReturnType<typeof useLoadMore<T>>;
