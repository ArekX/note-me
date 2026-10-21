import {
    createPasskey,
    isPasskeyCancelled,
    passkeyErrorMessage,
    supportsPasskeys,
} from "@/lib/passkeys";
import { useAiPasswordStore } from "@/stores/ai-password";
import type {
    DeleteOwnPasskeyMessage,
    DeleteOwnPasskeyResponse,
    GetOwnPasskeysMessage,
    GetOwnPasskeysResponse,
    GetPasskeyRegistrationMessage,
    GetPasskeyRegistrationResponse,
    UpdateOwnPasskeyMessage,
    UpdateOwnPasskeyResponse,
    VerifyPasskeyRegistrationMessage,
    VerifyPasskeyRegistrationResponse,
} from "@/types/messages";
import {
    declined,
    done,
    failed,
    type ToolContext,
    type ToolOutcome,
} from "./tool-outcome";

export const NO_PASSWORD_TEXT = "The user did not confirm with their password.";

// Newest first, so a new passkey is the first one.
const ownPasskeys = async (context: ToolContext) =>
    (
        await context.service.sendMessage<
            GetOwnPasskeysMessage,
            GetOwnPasskeysResponse
        >("users", "getOwnPasskeys", {
            data: { page: 1 },
            expect: "getOwnPasskeysResponse",
        })
    ).records.results;

export const addPasskey = async (
    args: Record<string, unknown>,
    context: ToolContext,
): Promise<ToolOutcome> => {
    if (!supportsPasskeys()) {
        return failed("This browser does not support passkeys.");
    }
    const password = await useAiPasswordStore().ask({
        title: "Add a passkey",
        message:
            "The assistant wants to add a passkey for signing in on this device. Enter your password to continue; your device will then ask you to create the passkey.",
        confirmLabel: "Continue",
    });
    if (password === null) {
        return declined(NO_PASSWORD_TEXT);
    }

    const { options } = await context.service.sendMessage<
        GetPasskeyRegistrationMessage,
        GetPasskeyRegistrationResponse
    >("users", "getPasskeyRegistrationOptions", {
        data: { password },
        expect: "getPasskeyRegistrationOptionsResponse",
    });
    if (!options) {
        return failed("The server did not accept the password.");
    }
    let credential;
    try {
        credential = await createPasskey(options);
    } catch (error) {
        return isPasskeyCancelled(error)
            ? declined("The user closed the passkey prompt.")
            : failed(passkeyErrorMessage(error));
    }
    const result = await context.service.sendMessage<
        VerifyPasskeyRegistrationMessage,
        VerifyPasskeyRegistrationResponse
    >("users", "verifyPasskeyRegistration", {
        data: { response: credential },
        expect: "verifyPasskeyRegistrationResponse",
        notOwn: true,
    });
    if (!result.success) {
        return failed(result.fail_reason ?? "The passkey was not registered.");
    }

    const name = typeof args.name === "string" ? args.name.trim() : "";
    const [created] = await ownPasskeys(context);
    if (name && created) {
        await context.service.sendMessage<
            UpdateOwnPasskeyMessage,
            UpdateOwnPasskeyResponse
        >("users", "updateOwnPasskey", {
            data: { id: created.id, name },
            expect: "updateOwnPasskeyResponse",
            notOwn: true,
        });
    }
    return done({ added: true, id: created?.id, name: name || created?.name });
};

export const deletePasskey = async (
    args: Record<string, unknown>,
    context: ToolContext,
): Promise<ToolOutcome> => {
    const id = Number(args.id);
    const passkey = (await ownPasskeys(context)).find((p) => p.id === id);
    const password = await useAiPasswordStore().ask({
        title: "Remove a passkey",
        message: `The assistant wants to remove the passkey ${passkey ? `"${passkey.name}"` : `#${id}`}; you will no longer be able to sign in with it. Enter your password to remove it.`,
        confirmLabel: "Remove passkey",
    });
    if (password === null) {
        return declined(NO_PASSWORD_TEXT);
    }
    await context.service.sendMessage<
        DeleteOwnPasskeyMessage,
        DeleteOwnPasskeyResponse
    >("users", "deleteOwnPasskey", {
        data: { id },
        expect: "deleteOwnPasskeyResponse",
        notOwn: true,
    });
    return done({ removed: id });
};
