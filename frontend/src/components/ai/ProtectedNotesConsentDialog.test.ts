import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { MOCK_PASSWORD } from "@/test/mock-backend";
import { ALLOW_DELAY_SECONDS, useAiConsentStore } from "@/stores/ai-consent";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useSocketStore } from "@/stores/socket";
import ProtectedNotesConsentDialog from "./ProtectedNotesConsentDialog.vue";

const button = (wrapper: VueWrapper, text: string) =>
    wrapper.findAll("button").find((b) => b.text().startsWith(text))!;

describe("ProtectedNotesConsentDialog", () => {
    beforeEach(async () => {
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
        await useSocketStore().connect();
    });

    afterEach(() => {
        vi.useRealTimers();
        useSocketStore().disconnect();
        document.body.innerHTML = "";
    });

    it("unlocks and grants only with the right password", async () => {
        const wrapper = mount(ProtectedNotesConsentDialog, {
            attachTo: document.body,
        });
        const consent = useAiConsentStore();
        const answer = consent.ask(1, {
            needsPassword: true,
        });
        await flushPromises();

        expect(wrapper.text()).toContain(
            "Protected note data will be sent to the AI provider.",
        );
        expect(wrapper.text()).toContain(
            "Your password is never sent to the AI.",
        );

        await wrapper.get('input[type="password"]').setValue("wrong");
        await button(wrapper, "Unlock and allow").trigger("click");
        expect(
            wrapper.get('input[type="password"]').attributes("autofocus"),
        ).toBeDefined();
        await vi.waitFor(() =>
            expect(wrapper.text()).toContain("Invalid password"),
        );
        await vi.waitFor(() =>
            expect(document.activeElement).toBe(
                wrapper.get('input[type="password"]').element,
            ),
        );
        expect(consent.request).not.toBeNull();
        expect(consent.isGranted(1)).toBe(false);
        expect(useProtectionLockStore().isLocked).toBe(true);

        await wrapper.get('input[type="password"]').setValue(MOCK_PASSWORD);
        await button(wrapper, "Unlock and allow").trigger("click");
        expect(await answer).toBe(true);
        expect(consent.isGranted(1)).toBe(true);
        expect(consent.isGranted(2)).toBe(false);
        expect(useProtectionLockStore().isLocked).toBe(false);
        wrapper.unmount();
    });

    it("keeps Allow disabled for the countdown when protection is unlocked", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        const wrapper = mount(ProtectedNotesConsentDialog, {
            attachTo: document.body,
        });
        const consent = useAiConsentStore();
        const answer = consent.ask(1, {
            needsPassword: false,
        });
        await flushPromises();

        const allow = () => button(wrapper, "Allow for this conversation");
        expect(wrapper.find('input[type="password"]').exists()).toBe(false);
        expect(allow().attributes("disabled")).toBeDefined();
        expect(allow().text()).toContain(`(${ALLOW_DELAY_SECONDS})`);

        vi.advanceTimersByTime((ALLOW_DELAY_SECONDS - 1) * 1000);
        await flushPromises();
        expect(allow().attributes("disabled")).toBeDefined();
        expect(allow().text()).toContain("(1)");

        vi.advanceTimersByTime(1000);
        await flushPromises();
        expect(allow().attributes("disabled")).toBeUndefined();
        await allow().trigger("click");
        expect(await answer).toBe(true);
        wrapper.unmount();
    });

    it("denies", async () => {
        const wrapper = mount(ProtectedNotesConsentDialog, {
            attachTo: document.body,
        });
        const consent = useAiConsentStore();
        const answer = consent.ask(3, {
            needsPassword: false,
        });
        await flushPromises();
        await button(wrapper, "Deny").trigger("click");
        expect(await answer).toBe(false);
        expect(consent.isGranted(3)).toBe(false);
        expect(wrapper.find("dialog").exists()).toBe(false);
        wrapper.unmount();
    });
});
