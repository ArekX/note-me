import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type Component } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import LockedContentWrapper from "./LockedContentWrapper.vue";

const encrypted = `mock:${btoa("secret text")}`;

const mountWrapper = (records: { note: string; is_encrypted: boolean }[]) =>
    mount(
        defineComponent({
            setup: () => () =>
                h(
                    LockedContentWrapper as Component,
                    {
                        records,
                        protectedKeys: ["note"],
                        isLockedKey: "is_encrypted",
                    },
                    {
                        default: ({
                            records: unlocked,
                        }: {
                            records: { note: string }[];
                        }) => h("p", { class: "content" }, unlocked[0]!.note),
                    },
                ),
        }),
    );

describe("LockedContentWrapper", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("shows unprotected records at once", () => {
        const wrapper = mountWrapper([{ note: "plain", is_encrypted: false }]);
        expect(wrapper.get(".content").text()).toBe("plain");
    });

    it("waits for the password, decrypts a copy and re-locks", async () => {
        const records = [{ note: encrypted, is_encrypted: true }];
        const wrapper = mountWrapper(records);
        const lock = useProtectionLockStore();
        expect(wrapper.text()).toContain("Waiting for protection unlock...");

        lock.resolveUnlockRequest("admin");
        await vi.waitFor(() =>
            expect(wrapper.find(".content").text()).toBe("secret text"),
        );
        expect(records[0]!.note).toBe(encrypted);

        lock.lock();
        await flushPromises();
        expect(wrapper.text()).toContain(
            "Could not unlock due to: Locked by protection lock.",
        );

        await wrapper.get("button").trigger("click");
        lock.resolveUnlockRequest("admin");
        await vi.waitFor(() =>
            expect(wrapper.find(".content").text()).toBe("secret text"),
        );
    });

    it("explains a cancelled unlock and a wrong password", async () => {
        const wrapper = mountWrapper([{ note: encrypted, is_encrypted: true }]);
        const lock = useProtectionLockStore();

        lock.rejectUnlockRequest("User cancelled password entry.");
        await flushPromises();
        expect(wrapper.text()).toContain(
            "Could not unlock due to: User cancelled password entry.",
        );

        await wrapper.get("button").trigger("click");
        lock.resolveUnlockRequest("wrong");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain(
                "Could not unlock due to: Could not decrypt, wrong password or corrupted data.",
            ),
        );
    });
});
