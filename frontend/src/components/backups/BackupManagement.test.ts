import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { settingsHandlers } from "@/test/mock-backend/handlers/settings";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import type { GetBackupTargetsResponse } from "@/types/messages";
import BackupManagement from "./BackupManagement.vue";

vi.mock("vue-router", () => ({
    RouterLink: { template: "<a><slot /></a>" },
}));

const openDialog = (wrapper: VueWrapper) =>
    wrapper.findAll("dialog").find((d) => d.element.open)!;

const clickIn = async (wrapper: VueWrapper, text: string) => {
    const button = openDialog(wrapper)
        .findAll("button")
        .find((b) => b.text() === text);
    expect(button, `button "${text}"`).toBeDefined();
    await button!.trigger("click");
    await flushPromises();
};

const fill = async (wrapper: VueWrapper, label: string, value: string) => {
    const field = openDialog(wrapper)
        .findAll("label")
        .find((l) => l.text() === label)!
        .element.parentElement!.querySelector("input")!;
    field.value = value;
    field.dispatchEvent(new Event("input"));
    await flushPromises();
};

const targetNames = (wrapper: VueWrapper) =>
    wrapper.findAll("tbody tr").map((row) => row.find("td").text());

describe("BackupManagement", () => {
    beforeEach(async () => {
        // jsdom has no modal dialogs.
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    const mountPage = async () => {
        const wrapper = mount(BackupManagement, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(targetNames(wrapper)).toEqual([
                "Local backups",
                "S3 offsite",
            ]),
        );
        return wrapper;
    };

    it("explains that backups are disabled", async () => {
        vi.spyOn(settingsHandlers, "getBackupTargets").mockImplementation(
            (_m, { respond }) =>
                respond<GetBackupTargetsResponse>("getBackupTargetsResponse", {
                    targets: [],
                    max_backup_count: 0,
                }),
        );
        const wrapper = mount(BackupManagement, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Backups are disabled"),
        );
    });

    it("creates a local target after validation", async () => {
        const wrapper = await mountPage();

        await wrapper
            .findAll("button")
            .find((b) => b.text() === "New target")!
            .trigger("click");
        await flushPromises();
        await fill(wrapper, "Target name", "Nightly");
        await clickIn(wrapper, "Save");
        expect(openDialog(wrapper).text()).toContain("Location must be set.");

        await fill(wrapper, "Location", "/srv/backups");
        await clickIn(wrapper, "Save");
        await vi.waitFor(() =>
            expect(targetNames(wrapper)).toEqual([
                "Local backups",
                "S3 offsite",
                "Nightly",
            ]),
        );
    });

    it("keeps the stored S3 secret when the field is left empty", async () => {
        const offsite = mockControl.state.backupTargets[1]!;
        if (offsite.type !== "s3") {
            throw new Error("fixture changed");
        }
        offsite.settings.credentials = {
            type: "access_key",
            access_key_id: "AKIA",
            secret_access_key: "top-secret",
        };
        const wrapper = await mountPage();
        expect(wrapper.html()).not.toContain("top-secret");

        await wrapper.findAll('button[title="Manage"]')[1]!.trigger("click");
        await flushPromises();
        await fill(wrapper, "Target name", "Offsite renamed");
        await clickIn(wrapper, "Save");

        await vi.waitFor(() =>
            expect(targetNames(wrapper)).toContain("Offsite renamed"),
        );
        const stored = mockControl.state.backupTargets[1]!;
        expect(
            stored.type === "s3" &&
                stored.settings.credentials.type === "access_key" &&
                stored.settings.credentials.secret_access_key,
        ).toBe("top-secret");
    });

    it("creates, downloads and deletes backups in the backup list", async () => {
        const open = vi.spyOn(window, "open").mockReturnValue(null);
        const wrapper = await mountPage();

        await wrapper.findAll('button[title="Manage"]')[0]!.trigger("click");
        await flushPromises();
        await clickIn(wrapper, "Backup List");
        await vi.waitFor(() =>
            expect(openDialog(wrapper).findAll("tbody tr")).toHaveLength(3),
        );

        await clickIn(wrapper, "Create manual backup");
        await vi.waitFor(() =>
            expect(openDialog(wrapper).findAll("tbody tr")).toHaveLength(4),
        );
        expect(openDialog(wrapper).find("tbody tr").text()).toMatch(
            /^manual-.*\.zip\.enc/,
        );

        await openDialog(wrapper)
            .get('button[title="Download"]')
            .trigger("click");
        expect(open).toHaveBeenCalledWith(
            expect.stringMatching(
                /^\/api\/settings\/download-backup\?identifier=manual-.*\.zip\.enc&target_id=1$/,
            ),
            "_blank",
        );

        await openDialog(wrapper)
            .get('button[title="Delete"]')
            .trigger("click");
        await flushPromises();
        await clickIn(wrapper, "Ok");
        await vi.waitFor(() =>
            expect(openDialog(wrapper).findAll("tbody tr")).toHaveLength(3),
        );
    });

    it("reports a failed manual backup", async () => {
        const wrapper = await mountPage();

        await wrapper.findAll('button[title="Manage"]')[1]!.trigger("click");
        await flushPromises();
        await clickIn(wrapper, "Backup List");
        await clickIn(wrapper, "Create manual backup");

        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "Could not create backup: S3 offsite: AccessDenied (mock)",
            ),
        );
    });
});
