import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import UserPasskeys from "./UserPasskeys.vue";

vi.mock("@/lib/passkeys", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/passkeys")>()),
    supportsPasskeys: () => true,
    createPasskey: async () => ({
        id: "bW9jay1jcmVkZW50aWFs",
        rawId: "bW9jay1jcmVkZW50aWFs",
        type: "public-key",
        clientExtensionResults: {},
        response: { clientDataJSON: "", attestationObject: "" },
    }),
}));

const clickButton = async (wrapper: VueWrapper, text: string) => {
    const button = wrapper.findAll("button").find((b) => b.text() === text);
    expect(button, `button "${text}"`).toBeDefined();
    await button!.trigger("click");
    await flushPromises();
};

const fillAndSubmit = async (wrapper: VueWrapper, value: string) => {
    const dialog = wrapper.findAll("dialog").find((d) => d.element.open)!;
    const input = dialog.get("input");
    await input.setValue(value);
    await dialog.get("form").trigger("submit");
    await flushPromises();
};

const passkeyNames = (wrapper: VueWrapper) =>
    wrapper.findAll("tbody tr").map((row) => row.find("td").text());

describe("UserPasskeys", () => {
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

    const mountPasskeys = async () => {
        const wrapper = mount(UserPasskeys, { attachTo: document.body });
        await vi.waitFor(() =>
            expect(passkeyNames(wrapper)).toEqual([
                "Platform authenticator (built-in into OS)",
            ]),
        );
        return wrapper;
    };

    it("asks for the password once, then registers passkeys", async () => {
        const wrapper = await mountPasskeys();

        await clickButton(wrapper, "Register device");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Confirm your password"),
        );

        await fillAndSubmit(wrapper, "wrong");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Invalid password."),
        );
        expect(mockControl.state.passkeys).toHaveLength(1);

        await fillAndSubmit(wrapper, "admin");
        await vi.waitFor(() =>
            expect(mockControl.state.passkeys).toHaveLength(2),
        );
        await vi.waitFor(() => expect(passkeyNames(wrapper)).toHaveLength(2));
        expect(useToastStore().messages.at(-1)?.text).toBe(
            "Passkey registered.",
        );

        await clickButton(wrapper, "Register device");
        await vi.waitFor(() =>
            expect(mockControl.state.passkeys).toHaveLength(3),
        );
        expect(
            wrapper.findAll("dialog").filter((d) => d.element.open),
        ).toHaveLength(0);
    });

    it("renames a passkey and shows server validation errors", async () => {
        const wrapper = await mountPasskeys();

        await wrapper.get('button[title="Rename"]').trigger("click");
        await fillAndSubmit(wrapper, " ");
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain(
                "Name must have at least one character",
            ),
        );

        await fillAndSubmit(wrapper, "Work laptop");
        await vi.waitFor(() =>
            expect(passkeyNames(wrapper)).toEqual(["Work laptop"]),
        );
        expect(mockControl.state.passkeys[0]!.name).toBe("Work laptop");
    });

    it("deletes a passkey after confirmation", async () => {
        const wrapper = await mountPasskeys();

        await wrapper.get('button[title="Delete"]').trigger("click");
        await flushPromises();
        await clickButton(wrapper, "Delete passkey");

        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("No registered passkeys found."),
        );
        expect(mockControl.state.passkeys).toHaveLength(0);
    });
});
