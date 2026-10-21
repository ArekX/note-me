import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "@/test/mock-backend";
import { roleDefinitions } from "@/lib/rbac";
import { useDataExportStore } from "@/stores/data-export";
import { useHelpStore } from "@/stores/help";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import { useUserStore } from "@/stores/user";
import { browserTools } from "./browser-tools";

const signInAs = (role: "admin" | "user") =>
    useUserStore().setSession({
        user: { ...mockControl.state.currentUser, role },
        permissions: [...roleDefinitions[role].permissions],
        required_steps: [],
    });

const run = async (name: string, args: Record<string, unknown> = {}) =>
    browserTools[name]!(args, {
        conversationId: 1,
        service: await useSocketStore().getService(),
    });

describe("browser tools", () => {
    beforeEach(() => signInAs("user"));

    it("offers only the help topics the help window shows the user", async () => {
        const topics = JSON.parse((await run("list_help_topics")).content);
        const keys = topics.map((topic: { topic: string }) => topic.topic);
        expect(keys).toContain("ai-assistant");
        expect(keys).not.toContain("admin-ai");
        expect(await run("get_help_topic", { topic: "admin-ai" })).toEqual({
            status: "failed",
            content: "There is no help topic admin-ai.",
        });

        signInAs("admin");
        const admin = JSON.parse((await run("list_help_topics")).content);
        expect(admin.map((topic: { topic: string }) => topic.topic)).toContain(
            "admin-ai",
        );
    });

    it("reads a help page as text and opens help", async () => {
        const page = JSON.parse(
            (await run("get_help_topic", { topic: "ai-assistant" })).content,
        );
        expect(page.name).toBe("AI assistant");
        expect(page.text).toMatch(/^# AI assistant\n/);
        expect(page.text).toContain("Your password is never sent to the AI.");

        await run("open_help", { topic: "admin-ai" });
        expect(useHelpStore().isOpen).toBe(true);
        expect(useHelpStore().page).toBe("general");
        await run("open_help", { topic: "protecting-notes" });
        expect(useHelpStore().page).toBe("protecting-notes");
    });

    it("exports data through the button's confirmation", async () => {
        await useSocketStore().connect();
        useProtectionLockStore().resolveUnlockRequest("admin");
        const dataExport = useDataExportStore();

        const declined = run("export_my_data");
        await vi.waitFor(() => expect(dataExport.isConfirmVisible).toBe(true));
        expect((await run("export_my_data")).status).toBe("failed");
        dataExport.answer(false);
        expect(await declined).toEqual({
            status: "declined",
            content: "The user did not start the export.",
        });

        const started = run("export_my_data");
        await vi.waitFor(() => expect(dataExport.isConfirmVisible).toBe(true));
        dataExport.answer(true);
        expect((await started).status).toBe("done");
        expect(dataExport.isProcessing).toBe(true);
        await dataExport.cancel();
        useSocketStore().disconnect();
    });

    it("reads the profile without anything secret", async () => {
        const profile = JSON.parse((await run("get_profile")).content);
        expect(profile).toEqual({
            name: "Administrator",
            username: "admin",
            role: "user",
            timezone: "Europe/Belgrade",
            preferred_editor: "rich",
        });
    });
});
