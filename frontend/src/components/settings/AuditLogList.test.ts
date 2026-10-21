import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import AuditLogList from "./AuditLogList.vue";

const events = (wrapper: VueWrapper) =>
    wrapper.findAll("tbody tr").map((row) => row.findAll("td")[1]!.text());

const requests = () =>
    mockControl.log.filter(
        (entry) =>
            entry.direction === "out" && entry.message.type === "getAuditLog",
    );

describe("AuditLogList", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    const mountList = async () => {
        const wrapper = mount(AuditLogList);
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(20),
        );
        return wrapper;
    };

    it("renders the newest entries with their details", async () => {
        const wrapper = await mountList();
        expect(events(wrapper).slice(0, 3)).toEqual([
            "login_failed",
            "login_locked",
            "password_changed",
        ]);
        const first = wrapper.find("tbody tr");
        expect(first.text()).toContain("mallory");
        expect(first.text()).toContain("203.0.113.7");
        expect(first.text()).toContain("reason: unknown user");
        expect(first.find(".text-danger").exists()).toBe(true);
        expect(
            wrapper.findAll("tbody tr")[2]!.find(".text-danger").exists(),
        ).toBe(false);
        expect(wrapper.text()).not.toContain("<");

        const options = wrapper.findAll("select option").map((o) => o.text());
        expect(options).toEqual([
            "All events",
            "login",
            "login_failed",
            "login_locked",
            "password_changed",
        ]);
    });

    it("reloads the first page when a filter changes", async () => {
        const wrapper = await mountList();
        await wrapper.get("select").setValue("3");
        await vi.waitFor(
            () => expect(events(wrapper)).toEqual(["login_locked"]),
            { timeout: 2000 },
        );
        expect(requests()[0]!.message).toMatchObject({
            filters: { event: "login_locked" },
            page: 1,
        });

        await wrapper.get("select").setValue("0");
        await wrapper
            .get('input[placeholder="Search username"]')
            .setValue("jan");
        await vi.waitFor(
            () => expect(events(wrapper)).toEqual(["login_locked"]),
            { timeout: 2000 },
        );

        await wrapper.get('input[placeholder="Search username"]').setValue("");
        const dates = wrapper.findAll('input[type="date"]');
        await dates[0]!.setValue("2000-01-01");
        await dates[1]!.setValue("2000-01-02");
        await vi.waitFor(
            () =>
                expect(wrapper.text()).toContain("No audit log entries found."),
            { timeout: 2000 },
        );
        expect(requests()[0]!.message).toMatchObject({
            filters: { from: 946684800, to: 946857599 },
        });
    });

    it("pages through the entries", async () => {
        const wrapper = await mountList();
        await wrapper
            .findAll("button")
            .find((b) => b.text() === "2")!
            .trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.findAll("tbody tr")).toHaveLength(3),
        );
        expect(requests()[0]!.message).toMatchObject({ page: 2 });
        expect(events(wrapper)).toEqual(["login", "login", "login"]);
    });
});
