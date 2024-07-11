import { useSignal } from "@preact/signals";

export const useLoadMoreData = <T>() => {
    const hasMoreData = useSignal(true);

    const records = useSignal<T[]>([]);

    const setNoMoreData = () => {
        hasMoreData.value = false;
    };

    const addMoreRecords = (newRecords: T[]) => {
        records.value = [...records.value, ...newRecords];
    };

    const resetData = () => {
        records.value = [];
        hasMoreData.value = true;
    };

    return {
        records,
        hasMoreData,
        resetData,
        setNoMoreData,
        addMoreRecords,
    };
};
