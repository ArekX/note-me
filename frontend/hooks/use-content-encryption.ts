import { useProtectionLock } from "$frontend/hooks/use-protection-lock.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DecryptTextMessage,
    DecryptTextResponse,
    EncryptTextMessage,
    EncryptTextResponse,
} from "$workers/websocket/api/users/messages.ts";

export const useContentEncryption = () => {
    const protectionLock = useProtectionLock();

    const { sendMessage } = useWebsocketService();

    const decryptText = async (text: string): Promise<string> => {
        const response = await sendMessage<
            DecryptTextMessage,
            DecryptTextResponse
        >("users", "decryptText", {
            data: {
                encrypted: text,
                password: await protectionLock.requestUnlock() ?? "",
            },
            expect: "decryptTextResponse",
        });
        return response.text;
    };

    const encryptText = async (text: string): Promise<string> => {
        const response = await sendMessage<
            EncryptTextMessage,
            EncryptTextResponse
        >("users", "encryptText", {
            data: {
                text,
                password: await protectionLock.requestUnlock() ?? "",
            },
            expect: "encryptTextResponse",
        });

        return response.encrypted;
    };

    return {
        decryptText,
        encryptText,
    };
};
