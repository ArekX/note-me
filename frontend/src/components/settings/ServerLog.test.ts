import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import ServerLog from "./ServerLog.vue";

const requests = () =>
    mockControl.log.filter(
        (entry) =>
            entry.direction === "out" && entry.message.type === "getServerLog",
    ).length;

describe("ServerLog", () => {
    beforeEach(async () => {
        await useSocketStore().connect();
    });

    afterEach(() => {
        vi.useRealTimers();
        useSocketStore().disconnect();
    });

    it("renders the log lines as text", async () => {
        mockControl.state.serverLog.push("<b>not html</b>");
        const wrapper = mount(ServerLog);
        await vi.waitFor(() => expect(wrapper.find("pre").exists()).toBe(true));

        const pre = wrapper.get("pre");
        expect(pre.text()).toContain("INFO  server started addr=:8000");
        expect(pre.text()).toContain("WARN  login failed username=mallory");
        expect(pre.text()).toContain("<b>not html</b>");
        expect(pre.find("b").exists()).toBe(false);
    });

    it("renders the log colours and hides the escape codes", async () => {
        mockControl.state.serverLog.push(
            "\x1b[33m 2026-10-21 08:06:00 WARN  [worker|periodic-task]  Periodic task failed\x1b[0m task:backup-database",
        );
        const wrapper = mount(ServerLog);
        await vi.waitFor(() => expect(wrapper.find("pre").exists()).toBe(true));

        const pre = wrapper.get("pre");
        expect(pre.text()).not.toContain("\x1b");
        const warnings = pre
            .findAll("span.text-warning")
            .map((span) => span.text());
        expect(warnings).toContain(
            "2026-10-21 08:06:00 WARN  [worker|periodic-task]  Periodic task failed",
        );
        expect(pre.find("span.text-success").text()).toContain(
            "INFO  server started",
        );
        const plain = pre
            .findAll("span")
            .filter((span) => span.text().includes("task:backup-database"));
        expect(plain).toHaveLength(1);
        expect(plain[0]!.classes()).toHaveLength(0);
    });

    it("refreshes on demand and every 10 seconds until unmounted", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        const wrapper = mount(ServerLog);
        await vi.waitFor(() => expect(wrapper.find("pre").exists()).toBe(true));

        mockControl.state.serverLog.push("manual refresh line");
        await wrapper
            .findAll("button")
            .find((button) => button.text() === "Refresh")!
            .trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("manual refresh line"),
        );

        mockControl.state.serverLog.push("timer refresh line");
        vi.advanceTimersByTime(10_000);
        await flushPromises();
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("timer refresh line"),
        );

        const before = requests();
        wrapper.unmount();
        vi.advanceTimersByTime(30_000);
        expect(requests()).toBe(before);
    });
});
