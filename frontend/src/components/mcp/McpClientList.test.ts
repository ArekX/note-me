import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import McpClientList from "./McpClientList.vue";

const openDialog = (wrapper: VueWrapper) =>
    wrapper.findAll("dialog").find((d) => d.element.open);

const clickButton = async (wrapper: VueWrapper, text: string) => {
    const button = wrapper.findAll("button").find((b) => b.text() === text);
    expect(button, `button "${text}"`).toBeDefined();
    await button!.trigger("click");
    await flushPromises();
};

const clickRowAction = async (
    wrapper: VueWrapper,
    name: string,
    title: string,
) => {
    const row = wrapper
        .findAll("tbody tr")
        .find((r) => r.find("td").text().startsWith(name))!;
    await row.get(`button[title="${title}"]`).trigger("click");
    await flushPromises();
};

const submitForm = async (wrapper: VueWrapper) => {
    await openDialog(wrapper)!.get("form").trigger("submit");
    await flushPromises();
};

const clientNames = (wrapper: VueWrapper) =>
    wrapper
        .findAll("tbody tr")
        .map((row) => row.find("td").text().replace(/\s+/g, " "));

describe("McpClientList", () => {
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
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    const mountList = async () => {
        const wrapper = mount(McpClientList, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(clientNames(wrapper)).toEqual([
                "Claude Code",
                "claude.ai Read only",
            ]),
        );
        return wrapper;
    };

    it("lists the clients", async () => {
        const wrapper = await mountList();
        const [token, oauth] = wrapper.findAll("tbody tr");
        expect(token!.text()).toContain("Token");
        expect(token!.text()).toContain("nmcp_Xk3q…");
        expect(oauth!.text()).toContain("OAuth");
        expect(oauth!.text()).toContain("mock-client-id");
        expect(oauth!.text()).toContain("Never");
    });

    it("adds a token client and shows its token only once", async () => {
        const wrapper = await mountList();

        await clickButton(wrapper, "Add client");
        await openDialog(wrapper)!.get("input").setValue("Cursor");
        await submitForm(wrapper);
        await vi.waitFor(() =>
            expect(openDialog(wrapper)?.text()).toContain("Connect Cursor"),
        );

        const added = mockControl.state.mcpClients.at(-1)!;
        expect(added).toMatchObject({
            name: "Cursor",
            kind: "token",
            is_read_only: false,
            redirect_uris: [],
        });
        const dialog = openDialog(wrapper)!;
        const token = dialog
            .findAll("code")
            .map((c) => c.text())
            .find((t) => t.startsWith("nmcp_"))!;
        expect(token).toMatch(/^nmcp_mock-secret-\d+$/);
        expect(dialog.text()).toContain("cannot be shown again");
        expect(dialog.text()).toContain(`${location.origin}/mcp`);
        expect(dialog.text()).toContain(
            `claude mcp add --transport http noteme ${location.origin}/mcp --header "Authorization: Bearer ${token}"`,
        );
        expect(dialog.text()).toContain('"mcpServers"');

        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
            value: { writeText },
            configurable: true,
        });
        await dialog.get('button[title="Copy token"]').trigger("click");
        await flushPromises();
        expect(writeText).toHaveBeenCalledWith(token);
        await vi.waitFor(() =>
            expect(clientNames(wrapper)).toContain("Cursor"),
        );

        await clickButton(wrapper, "Done");
        expect(wrapper.text()).not.toContain(token);

        wrapper.unmount();
        const again = mount(McpClientList, { attachTo: document.body });
        await vi.waitFor(() => expect(clientNames(again)).toContain("Cursor"));
        expect(again.text()).not.toContain(token);
    });

    it("validates and adds an OAuth client with presets", async () => {
        const wrapper = await mountList();

        await clickButton(wrapper, "Add client");
        await clickButton(wrapper, "OAuth");
        expect(openDialog(wrapper)!.text()).toContain(
            "For Claude Desktop, claude.ai and ChatGPT connectors.",
        );
        await submitForm(wrapper);
        expect(openDialog(wrapper)!.text()).toContain(
            "Name must have at least one character",
        );
        expect(openDialog(wrapper)!.text()).toContain(
            "Add at least one redirect URI.",
        );

        const [name, uri] = openDialog(wrapper)!.findAll("input[type=text]");
        await name!.setValue("claude.ai");
        await uri!.setValue("http://example.com/callback");
        await submitForm(wrapper);
        expect(openDialog(wrapper)!.text()).toContain(
            "Redirect URI must use https, or http on localhost.",
        );

        await uri!.setValue("");
        await clickButton(wrapper, "Claude");
        await clickButton(wrapper, "ChatGPT");
        await submitForm(wrapper);
        await vi.waitFor(() =>
            expect(useToastStore().messages.at(-1)?.text).toBe(
                "MCP client with this name already exists.",
            ),
        );
        expect(mockControl.state.mcpClients).toHaveLength(2);

        await name!.setValue("ChatGPT and Claude");
        await submitForm(wrapper);
        await vi.waitFor(() =>
            expect(openDialog(wrapper)?.text()).toContain(
                "Connect ChatGPT and Claude",
            ),
        );
        const added = mockControl.state.mcpClients.at(-1)!;
        expect(added.redirect_uris).toEqual([
            "https://claude.ai/api/mcp/auth_callback",
            "https://claude.com/api/mcp/auth_callback",
            "https://chatgpt.com/connector_platform_oauth_redirect",
        ]);
        const text = openDialog(wrapper)!.text();
        expect(text).toContain(added.client_id!);
        expect(text).toMatch(/nmcps_mock-secret-\d+/);
        expect(text).toContain("Claude Desktop and claude.ai");
        expect(text).toContain("ChatGPT");
    });

    it("edits a client", async () => {
        const wrapper = await mountList();

        await clickRowAction(wrapper, "Claude Code", "Edit");
        const dialog = openDialog(wrapper)!;
        await dialog.get("input[type=text]").setValue("Claude Code at work");
        await dialog.get("input[type=checkbox]").setValue(true);
        await submitForm(wrapper);

        await vi.waitFor(() =>
            expect(clientNames(wrapper)[0]).toBe(
                "Claude Code at work Read only",
            ),
        );
        expect(mockControl.state.mcpClients[0]).toMatchObject({
            name: "Claude Code at work",
            is_read_only: true,
        });
    });

    it("generates a new token after confirmation", async () => {
        const wrapper = await mountList();
        const oldPrefix = mockControl.state.mcpClients[0]!.token_prefix;

        await clickRowAction(wrapper, "Claude Code", "Generate a new token");
        expect(openDialog(wrapper)!.text()).toContain(
            "The old token is deleted and stops working at once",
        );
        await clickButton(wrapper, "Generate");

        await vi.waitFor(() =>
            expect(openDialog(wrapper)?.text()).toContain(
                "Connect Claude Code",
            ),
        );
        expect(openDialog(wrapper)!.text()).toMatch(/nmcp_mock-secret-\d+/);
        expect(mockControl.state.mcpClients[0]!.token_prefix).not.toBe(
            oldPrefix,
        );
    });

    it("warns that a new client secret is needed only on the next connect", async () => {
        const wrapper = await mountList();

        await clickRowAction(
            wrapper,
            "claude.ai",
            "Generate a new client secret",
        );
        expect(openDialog(wrapper)!.text()).toContain(
            "need the new secret only when they connect again",
        );
    });

    it("deletes a client after confirmation", async () => {
        const wrapper = await mountList();

        await clickRowAction(wrapper, "Claude Code", "Delete");
        expect(openDialog(wrapper)!.text()).toContain("loses access at once");
        await clickButton(wrapper, "Delete client");

        await vi.waitFor(() =>
            expect(clientNames(wrapper)).toEqual(["claude.ai Read only"]),
        );
        expect(mockControl.state.mcpClients.map((c) => c.id)).toEqual([2]);
    });
});
