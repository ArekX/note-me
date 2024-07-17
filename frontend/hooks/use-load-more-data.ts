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

    const getLastRecordKey = <K extends keyof T>(key: K): T[K] | undefined => {
        const lastRecord = records.value[records.value.length - 1];

        return lastRecord ? lastRecord[key] : undefined;
    };

    return {
        records,
        hasMoreData,
        resetData,
        setNoMoreData,
        addMoreRecords,
        getLastRecordKey,
    };
};
