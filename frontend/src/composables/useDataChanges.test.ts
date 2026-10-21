import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import type {
    CreateTagMessage,
    CreateTagResponse,
    DataChangedResponse,
    DataEntity,
} from "@/types/messages";
import {
    RELOAD_DELAY_MS,
    useDataChanges,
    type ChangeSource,
    type DataChangesOptions,
} from "./useDataChanges";

const mountList = async (
    sources: ChangeSource[],
    options?: DataChangesOptions,
) => {
    const reload = vi.fn();
    const wrapper = mount(
        defineComponent({
            setup() {
                useDataChanges(sources, reload, options);
                return () => null;
            },
        }),
    );
    await flushPromises();
    return { reload, wrapper };
};

const pushChanged = (entity: DataEntity, ids: Array<number | string> = []) =>
    mockControl.push<DataChangedResponse>("changes", "dataChanged", {
        entity,
        ids,
    });

const pushTagCreated = () =>
    mockControl.push<CreateTagResponse>("tags", "createTagResponse", {
        record: { id: 9, name: "work" },
    });

const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, "visibilityState", {
        value: state,
        configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
};

describe("useDataChanges", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    afterEach(() => {
        vi.useRealTimers();
        setVisibility("visible");
        useSocketStore().disconnect();
    });

    it("reloads once per burst of responses and dataChanged", async () => {
        const { reload } = await mountList(["tag"]);

        pushTagCreated();
        pushChanged("tag", [1]);
        pushChanged("tag", [2]);
        vi.advanceTimersByTime(RELOAD_DELAY_MS - 1);
        expect(reload).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(reload).toHaveBeenCalledTimes(1);

        pushChanged("tag");
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it("ignores other entities and ids the view does not show", async () => {
        const { reload } = await mountList(["note"], {
            matches: (ids) => ids.includes(4),
        });

        pushChanged("tag", [4]);
        pushChanged("note", [5]);
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).not.toHaveBeenCalled();

        pushChanged("note", [4, 5]);
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("follows only dataChanged without responses", async () => {
        const { reload } = await mountList(["tag"], { responses: false });

        pushTagCreated();
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).not.toHaveBeenCalled();

        pushChanged("tag");
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("skips responses to this tab's own requests when asked", async () => {
        // The mock backend answers through a timer.
        vi.useRealTimers();
        const { reload } = await mountList(["tag"], { skipOwnRequests: true });

        const service = await useSocketStore().getService();
        await service.sendMessage<CreateTagMessage, CreateTagResponse>(
            "tags",
            "createTag",
            { data: { data: { name: "fresh" } }, expect: "createTagResponse" },
        );
        const afterBurst = () =>
            new Promise((resolve) => setTimeout(resolve, RELOAD_DELAY_MS * 2));
        await afterBurst();
        expect(reload).not.toHaveBeenCalled();

        pushTagCreated();
        await afterBurst();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("marks a hidden list stale and reloads it when shown", async () => {
        const { reload } = await mountList(["file"]);

        setVisibility("hidden");
        pushChanged("file", ["a"]);
        pushChanged("file", ["b"]);
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).not.toHaveBeenCalled();

        setVisibility("visible");
        expect(reload).toHaveBeenCalledTimes(1);
        setVisibility("hidden");
        setVisibility("visible");
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it("stops listening when unmounted", async () => {
        const { reload, wrapper } = await mountList(["tag"]);

        pushChanged("tag");
        wrapper.unmount();
        pushChanged("tag");
        vi.advanceTimersByTime(RELOAD_DELAY_MS);
        expect(reload).not.toHaveBeenCalled();
    });
});
