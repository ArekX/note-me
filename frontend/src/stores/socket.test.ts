import { afterEach, describe, expect, it } from "vitest";
import type { GetTreeMessage, GetTreeResponse } from "@/types/messages";
import { useSocketStore } from "./socket";

describe("socket store", () => {
    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("answers requests made while the first connect is still running", async () => {
        const store = useSocketStore();

        const [service] = await Promise.all([
            store.getService(),
            store.connect(),
        ]);

        const response = await service.sendMessage<
            GetTreeMessage,
            GetTreeResponse
        >("tree", "getTree", { data: {}, expect: "getTreeResponse" });
        expect(response.records.length).toBeGreaterThan(0);
    });
});
