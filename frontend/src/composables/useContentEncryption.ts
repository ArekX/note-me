import { useWebsocketService } from "./useWebsocketService";
import { useProtectionLockStore } from "@/stores/protection-lock";
import type {
    DecryptTextMessage,
    DecryptTextResponse,
    EncryptTextMessage,
    EncryptTextResponse,
} from "@/types/messages";

export const useContentEncryption = () => {
    const protectionLock = useProtectionLockStore();
    const { sendMessage } = useWebsocketService();

    const decryptText = async (encrypted: string) =>
        (
            await sendMessage<DecryptTextMessage, DecryptTextResponse>(
                "users",
                "decryptText",
                {
                    data: {
                        encrypted,
                        password: await protectionLock.requestUnlock(),
                    },
                    expect: "decryptTextResponse",
                },
            )
        ).text;

    const encryptText = async (text: string) =>
        (
            await sendMessage<EncryptTextMessage, EncryptTextResponse>(
                "users",
                "encryptText",
                {
                    data: {
                        text,
                        password: await protectionLock.requestUnlock(),
                    },
                    expect: "encryptTextResponse",
                },
            )
        ).encrypted;

    return { decryptText, encryptText };
};
