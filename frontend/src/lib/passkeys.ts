import {
    browserSupportsWebAuthn,
    startAuthentication,
    startRegistration,
    WebAuthnError,
    type AuthenticationResponseJSON,
    type PublicKeyCredentialCreationOptionsJSON,
    type PublicKeyCredentialRequestOptionsJSON,
    type RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export const supportsPasskeys = () => browserSupportsWebAuthn();

export const createPasskey = (
    optionsJSON: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> => startRegistration({ optionsJSON });

export const getPasskey = (
    optionsJSON: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON> => startAuthentication({ optionsJSON });

// NotAllowedError is what browsers raise when the user closes the passkey
// prompt or it times out; there is nothing to report then.
export const isPasskeyCancelled = (error: unknown): boolean =>
    error instanceof Error &&
    (error.name === "AbortError" ||
        error.name === "NotAllowedError" ||
        (error instanceof WebAuthnError &&
            error.code === "ERROR_CEREMONY_ABORTED"));

export const passkeyErrorMessage = (error: unknown): string => {
    if (error instanceof WebAuthnError) {
        switch (error.code) {
            case "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED":
                return "This device already has a passkey for your account.";
            case "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT":
                return "This authenticator cannot store passkeys. Use a password manager, phone or security key that supports passkeys.";
            case "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG":
                return "This authenticator does not support the signature algorithms NoteMe accepts.";
            case "ERROR_INVALID_DOMAIN":
            case "ERROR_INVALID_RP_ID":
                return "Passkeys only work when NoteMe is opened at its configured address (APP_URL).";
        }
    }
    return error instanceof Error && error.message
        ? error.message
        : "Unknown error";
};
