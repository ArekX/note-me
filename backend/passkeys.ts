import {
    AuthenticationResponseJSON,
    AuthenticatorTransportFuture,
    decodeBase64,
    generateAuthenticationOptions,
    generateRegistrationOptions,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from "$backend/deps.ts";
import { loadSessionStateByUserId } from "$backend/session/session.ts";
import { AppSessionData } from "$types";
import { getAppUrl } from "$backend/env.ts";
import { logger } from "$backend/logger.ts";
import { encodeBase64 } from "$std/encoding/base64.ts";
import { repository } from "$workers/database/lib.ts";

export const getRelyingPartyId = () => getAppUrl().hostname;
export const getRelyingPartyOrigin = () => getAppUrl().origin;

export const getDefaultPasskeyName = (
    transports: AuthenticatorTransportFuture[],
) => {
    if (transports.includes("usb")) {
        return "Hardware Security key";
    } else if (transports.includes("nfc")) {
        return "NFC device";
    } else if (transports.includes("ble")) {
        return "Bluetooth device";
    } else if (transports.includes("internal")) {
        return "Platform authenticator (built-in into OS)";
    } else if (transports.includes("cable")) {
        return "Cable authenticator";
    } else if (transports.includes("hybrid")) {
        return "Hybrid authenticator";
    } else if (transports.includes("smart-card")) {
        return "Smart card authenticator";
    }

    return "Passkey authenticator";
};

export const initializePasskeyRegistration = async (
    user_id: number,
) => {
    const session = await loadSessionStateByUserId<AppSessionData>(user_id);

    if (!session?.data.user) {
        throw new Error("User not found in session or is not logged in.");
    }

    const registeredPasskeys = await repository.passkey
        .getRegisteredUserPasskeys(
            user_id,
        );

    const options: PublicKeyCredentialCreationOptionsJSON =
        await generateRegistrationOptions({
            rpName: "NoteMe",
            rpID: getRelyingPartyId(),
            userName: session.data.user.username,
            attestationType: "none",
            excludeCredentials: registeredPasskeys.map((passkey) => ({
                id: passkey.credential_identifier,
                transports: passkey
                    .transports.split(
                        ",",
                    ) as unknown as AuthenticatorTransportFuture[],
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
            },
        });

    if (session) {
        await session.patch({
            registerPasskeyOptions: options,
        });
    }

    return options;
};

export type RegistrationResult = { success: true } | {
    success: false;
    fail_reason: string;
};

export const finalizePasskeyRegistration = async (
    user_id: number,
    registrationResponse: RegistrationResponseJSON,
): Promise<RegistrationResult> => {
    const session = await loadSessionStateByUserId<AppSessionData>(user_id);

    if (!session?.data.registerPasskeyOptions) {
        return {
            success: false,
            fail_reason: "No registration options found.",
        };
    }

    const options = session.data.registerPasskeyOptions!;

    try {
        const verification = await verifyRegistrationResponse({
            response: registrationResponse,
            expectedChallenge: options.challenge,
            expectedOrigin: getRelyingPartyOrigin(),
            expectedRPID: options.rp.id,
        });

        if (!verification.verified) {
            return { success: false, fail_reason: "Verification failed." };
        }

        if (!verification.registrationInfo) {
            return {
                success: false,
                fail_reason: "No registration info found.",
            };
        }

        if (
            await repository.passkey.passkeyExists(
                verification.registrationInfo.credential.id,
            )
        ) {
            return {
                success: false,
                fail_reason:
                    "This passkey is already registered to this or another account.",
            };
        }

        await repository.passkey.registerPassKey({
            noteme_user_id: user_id,
            name: getDefaultPasskeyName(
                registrationResponse.response.transports ?? [],
            ),
            webauthn_user: options.user,
            registration_info: {
                credentialID: verification.registrationInfo.credential.id,
                credentialBackedUp:
                    verification.registrationInfo.credentialBackedUp,
                counter: verification.registrationInfo.credential.counter,
                credentialPublicKey: encodeBase64(
                    verification.registrationInfo.credential.publicKey,
                ),
            },
            transports: registrationResponse.response.transports ?? [],
        });

        return { success: true };
    } catch (e: Error | unknown) {
        const errorMessage = (e as Error).message ?? "Unknown error";
        logger.debug("Error verifying registration response. Error: {e}", {
            e: errorMessage,
        });
        return {
            success: false,
            fail_reason:
                `Verification failed due to exception: ${errorMessage}`,
        };
    } finally {
        await session.patch({
            registerPasskeyOptions: undefined,
        });
    }
};

interface PasskeyAuthenticationRequest {
    data: PublicKeyCredentialRequestOptionsJSON;
    valid_until: number;
}

const requests = new Map<string, PasskeyAuthenticationRequest>();

const collectGarbage = () => {
    const now = Date.now();

    for (const [key, value] of requests) {
        if (value.valid_until < now) {
            requests.delete(key);
        }
    }
};

export interface PasskeyAuthenticationRequestData {
    request_id: string;
    options: PublicKeyCredentialRequestOptionsJSON;
}

export const initializePasskeyAuthentication = async (): Promise<
    PasskeyAuthenticationRequestData
> => {
    collectGarbage();

    const options: PublicKeyCredentialRequestOptionsJSON =
        await generateAuthenticationOptions({
            rpID: getRelyingPartyId(),
        });

    const passkeyRequestId = crypto.randomUUID();

    requests.set(passkeyRequestId, {
        data: options,
        valid_until: Date.now() + 300000,
    });

    return {
        request_id: passkeyRequestId,
        options,
    };
};

export interface FinalizedPasskeyAuthenticationData {
    user_id: number | null;
    verified: boolean;
}

export const finalizePasskeyAuthentication = async (
    passkeyRequestId: string,
    response: AuthenticationResponseJSON,
): Promise<FinalizedPasskeyAuthenticationData> => {
    collectGarbage();

    try {
        const request = requests.get(passkeyRequestId);

        if (!request) {
            return { user_id: null, verified: false };
        }

        const { data } = request;

        const passkey = await repository.passkey.getPasskeyById(response.id);

        if (!passkey) {
            return { user_id: null, verified: false };
        }

        const result = await verifyAuthenticationResponse({
            response,
            credential: {
                id: passkey.credential_identifier,
                counter: passkey.counter,
                publicKey: decodeBase64(passkey.public_key),
            },
            expectedChallenge: data.challenge,
            expectedOrigin: getRelyingPartyOrigin(),
            expectedRPID: getRelyingPartyId(),
        });

        if (result.verified) {
            await repository.passkey.updatePasskeyLastUsedAt(
                passkey.credential_identifier,
            );
        }

        return {
            user_id: result.verified ? passkey.user_id : null,
            verified: result.verified,
        };
    } catch (e: Error | unknown) {
        logger.debug("Error verifying authentication response, reason: {e}", {
            e: (e as Error).message ?? "Unknown error",
        });
        return { user_id: null, verified: false };
    } finally {
        requests.delete(passkeyRequestId);
    }
};
