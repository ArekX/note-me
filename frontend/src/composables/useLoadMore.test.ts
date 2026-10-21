import { describe, expect, it } from "vitest";
import { useLoadMore } from "./useLoadMore";

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
};

describe("useLoadMore", () => {
    it("appends pages from the last record until a short page", async () => {
        const seen: (number | null)[] = [];
        const list = useLoadMore<number>({
            limit: 2,
            onLoadMore: async (last) => {
                seen.push(last);
                return last === null ? [1, 2] : [3];
            },
        });

        await list.loadMore();
        expect(list.hasMore.value).toBe(true);
        await list.loadMore();
        expect(list.records.value).toEqual([1, 2, 3]);
        expect(list.hasMore.value).toBe(false);
        expect(seen).toEqual([null, 2]);

        await list.loadMore();
        expect(seen).toHaveLength(2);
    });

    it("ignores a second call while loading", async () => {
        const pending = deferred<number[]>();
        let calls = 0;
        const list = useLoadMore<number>({
            limit: 10,
            onLoadMore: () => {
                calls++;
                return pending.promise;
            },
        });

        const first = list.loadMore();
        void list.loadMore();
        expect(list.loader.running.value).toBe(true);
        pending.resolve([1]);
        await first;
        expect(calls).toBe(1);
        expect(list.loader.running.value).toBe(false);
    });

    it("drops a load that was still running when reset", async () => {
        const stale = deferred<number[]>();
        const fresh = deferred<number[]>();
        const responses = [stale.promise, fresh.promise];
        const list = useLoadMore<number>({
            limit: 10,
            onLoadMore: () => responses.shift()!,
        });

        const staleLoad = list.loadMore();
        list.reset();
        const freshLoad = list.loadMore();

        stale.resolve([1]);
        await staleLoad;
        expect(list.records.value).toEqual([]);
        expect(list.loader.running.value).toBe(true);

        fresh.resolve([2]);
        await freshLoad;
        expect(list.records.value).toEqual([2]);
        expect(list.loader.running.value).toBe(false);
    });
});
