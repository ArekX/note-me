import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_PASSWORD, mockControl } from "@/test/mock-backend";
import { useAiPasswordStore } from "@/stores/ai-password";
import { useSocketStore } from "@/stores/socket";
import { NO_PASSWORD_TEXT, addPasskey, deletePasskey } from "./passkey-tools";

const passkeys = vi.hoisted(() => ({ supported: true, cancel: false }));

vi.mock("@/lib/passkeys", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/passkeys")>()),
    supportsPasskeys: () => passkeys.supported,
    createPasskey: async () => {
        if (passkeys.cancel) {
            throw Object.assign(new Error("closed"), {
                name: "NotAllowedError",
            });
        }
        return {
            id: "new-credential",
            rawId: "new-credential",
            type: "public-key",
            response: {
                clientDataJSON: "",
                attestationObject: "",
                transports: ["internal"],
            },
            clientExtensionResults: {},
        };
    },
}));

const context = async () => ({
    conversationId: 1,
    service: await useSocketStore().getService(),
});

const answerPassword = async (password: string | null) => {
    const store = useAiPasswordStore();
    await vi.waitFor(() => expect(store.request).not.toBeNull());
    store.answer(password);
};

describe("passkey tools", () => {
    beforeEach(async () => {
        passkeys.supported = true;
        passkeys.cancel = false;
        // A recent confirmation on the server must not skip the browser's
        // own password box.
        mockControl.state.passkeyPasswordConfirmedUntil = Date.now() + 60_000;
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("adds a passkey only after the password", async () => {
        const before = mockControl.state.passkeys.length;
        const running = addPasskey({ name: "Work laptop" }, await context());
        await vi.waitFor(() =>
            expect(useAiPasswordStore().request?.title).toBe("Add a passkey"),
        );
        await answerPassword(MOCK_PASSWORD);
        const outcome = await running;
        expect(outcome.status).toBe("done");
        expect(JSON.parse(outcome.content)).toMatchObject({
            added: true,
            name: "Work laptop",
        });
        expect(mockControl.state.passkeys).toHaveLength(before + 1);
        expect(mockControl.state.passkeys[0]!.name).toBe("Work laptop");
        expect(outcome.content).not.toContain(MOCK_PASSWORD);
    });

    it("stops when the password box or the passkey prompt is closed", async () => {
        const before = mockControl.state.passkeys.length;
        const cancelled = addPasskey({}, await context());
        await answerPassword(null);
        expect(await cancelled).toEqual({
            status: "declined",
            content: NO_PASSWORD_TEXT,
        });

        passkeys.cancel = true;
        const closed = addPasskey({}, await context());
        await answerPassword(MOCK_PASSWORD);
        expect((await closed).status).toBe("declined");
        expect(mockControl.state.passkeys).toHaveLength(before);

        passkeys.supported = false;
        expect((await addPasskey({}, await context())).status).toBe("failed");
    });

    it("removes a passkey only after the password", async () => {
        const [passkey] = mockControl.state.passkeys;
        const denied = deletePasskey({ id: passkey!.id }, await context());
        await vi.waitFor(() =>
            expect(useAiPasswordStore().request?.message).toContain(
                `"${passkey!.name}"`,
            ),
        );
        await answerPassword(null);
        expect((await denied).status).toBe("declined");
        expect(
            mockControl.state.passkeys.some((p) => p.id === passkey!.id),
        ).toBe(true);

        const removed = deletePasskey({ id: passkey!.id }, await context());
        await answerPassword(MOCK_PASSWORD);
        expect(JSON.parse((await removed).content)).toEqual({
            removed: passkey!.id,
        });
        expect(
            mockControl.state.passkeys.some((p) => p.id === passkey!.id),
        ).toBe(false);
    });
});
