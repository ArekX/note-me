import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { usersHandlers } from "@/test/mock-backend/handlers/users";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import type {
    ExportOwnDataFinished,
    ExportOwnDataResponse,
} from "@/types/messages";
import DataExportDialogs from "./DataExportDialogs.vue";
import ExportMyData from "./ExportMyData.vue";

// The dialogs live in the app layout.
const Page = defineComponent({
    render: () => [h(ExportMyData), h(DataExportDialogs)],
});

// Hidden dialogs stay in the DOM, so only buttons outside of them or in an
// open one count.
const clickButton = async (wrapper: VueWrapper, text: string) => {
    const button = wrapper
        .findAll("button")
        .filter((b) => b.element.closest("dialog")?.open !== false)
        .find((b) => b.text() === text);
    expect(button, `button "${text}"`).toBeDefined();
    await button!.trigger("click");
    await flushPromises();
};

const startExport = async (wrapper: VueWrapper) => {
    await clickButton(wrapper, "Export my data");
    await clickButton(wrapper, "Ok");
};

describe("ExportMyData", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
        useProtectionLockStore().resolveUnlockRequest("admin");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("shows progress, then the download link", async () => {
        const open = vi.spyOn(window, "open").mockReturnValue(null);
        const wrapper = mount(Page, { attachTo: document.body });

        await startExport(wrapper);
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Exporting your data"),
        );
        await vi.waitFor(
            () => expect(wrapper.text()).toContain("Progress: 40%"),
            { timeout: 3000 },
        );
        await vi.waitFor(
            () =>
                expect(wrapper.text()).toContain(
                    "This link will expire in 6 hours.",
                ),
            { timeout: 5000 },
        );

        await clickButton(wrapper, "Download your data");
        expect(open).toHaveBeenCalledWith(
            expect.stringMatching(/^\/api\/data-export\/export-\d+$/),
        );
    });

    it("cancels a running export", async () => {
        const wrapper = mount(Page, { attachTo: document.body });

        await startExport(wrapper);
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Exporting your data"),
        );
        await clickButton(wrapper, "Cancel");

        await vi.waitFor(() =>
            expect(
                mockControl.log.some(
                    (entry) =>
                        entry.direction === "in" &&
                        entry.message.type === "cancelExportOwnDataResponse",
                ),
            ).toBe(true),
        );
        expect(wrapper.text()).not.toContain("Exporting your data");
        expect(wrapper.text()).not.toContain("exported successfully");
    });

    it("keeps events that arrive before the export id is known", async () => {
        vi.spyOn(usersHandlers, "exportOwnData").mockImplementation(
            (_message, { push, respond }) => {
                push<ExportOwnDataFinished>("users", "exportOwnDataFinished", {
                    export_id: "fast",
                });
                respond<ExportOwnDataResponse>("exportOwnDataResponse", {
                    export_id: "fast",
                    job_id: "job-fast",
                });
            },
        );
        const wrapper = mount(Page, { attachTo: document.body });

        await startExport(wrapper);
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("exported successfully"),
        );
    });

    it("asks for the password through the protection lock", async () => {
        useProtectionLockStore().lock();
        const wrapper = mount(Page, { attachTo: document.body });

        await startExport(wrapper);
        expect(useProtectionLockStore().isUnlockRequested).toBe(true);
        useProtectionLockStore().rejectUnlockRequest("cancelled");
        await flushPromises();

        expect(useToastStore().messages.at(-1)?.text).toBe(
            "User password is required to export data",
        );
        expect(wrapper.text()).not.toContain("Exporting your data");
    });
});
