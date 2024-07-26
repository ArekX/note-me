import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";

interface LoadMoreOptions<T> {
    onLoadMore: (lastRecord: T | null) => Promise<T[]>;
    limit: number;
    loaderInitialValue?: boolean;
}

export type LoadMoreHook = ReturnType<typeof useLoadMore>;

export const useLoadMore = <T>({
    onLoadMore,
    limit,
    loaderInitialValue = false,
}: LoadMoreOptions<T>) => {
    const records = useSignal<T[]>([]);
    const hasMore = useSignal(true);
    const loader = useLoader(loaderInitialValue);

    const loadMore = loader.wrap(async () => {
        const newRecords = await onLoadMore(
            records.value[records.value.length - 1] ?? null,
        );
        records.value = [...records.value, ...newRecords];
        hasMore.value = newRecords.length >= limit;
    });

    const reset = () => {
        records.value = [];
        hasMore.value = true;
    };

    return {
        records,
        hasMore,
        loader,
        loadMore,
        reset,
    };
};
