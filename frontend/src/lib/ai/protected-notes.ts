import type { SocketService } from "@/lib/socket";
import { useAiConsentStore } from "@/stores/ai-consent";
import { useProtectionLockStore } from "@/stores/protection-lock";
import type {
    DecryptTextMessage,
    DecryptTextResponse,
    EncryptTextMessage,
    EncryptTextResponse,
} from "@/types/messages";

export const DENIED_TEXT = "The user did not allow access to protected notes.";
export const LOCKED_TEXT =
    "Protected notes are locked. Ask the user to unlock them first.";

// A grant still needs unlocked protection, so a locked one asks again for
// the password, with the same warning.
export const ensureProtectedAccess = async (
    conversationId: number,
): Promise<boolean> => {
    const consent = useAiConsentStore();
    const protectionLock = useProtectionLockStore();
    if (consent.isGranted(conversationId) && !protectionLock.isLocked) {
        return true;
    }
    return consent.ask(conversationId, {
        needsPassword: protectionLock.isLocked,
    });
};

// Decryption and encryption stay in the browser; the password goes to this
// server only, never into a tool result.
export const decryptText = async (service: SocketService, encrypted: string) =>
    (
        await service.sendMessage<DecryptTextMessage, DecryptTextResponse>(
            "users",
            "decryptText",
            {
                data: {
                    encrypted,
                    password: await useProtectionLockStore().requestUnlock(),
                },
                expect: "decryptTextResponse",
            },
        )
    ).text;

export const encryptText = async (service: SocketService, text: string) =>
    (
        await service.sendMessage<EncryptTextMessage, EncryptTextResponse>(
            "users",
            "encryptText",
            {
                data: {
                    text,
                    password: await useProtectionLockStore().requestUnlock(),
                },
                expect: "encryptTextResponse",
            },
        )
    ).encrypted;
