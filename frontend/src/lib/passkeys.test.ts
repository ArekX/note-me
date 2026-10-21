import { describe, expect, it } from "vitest";
import { WebAuthnError } from "@simplewebauthn/browser";
import { isPasskeyCancelled, passkeyErrorMessage } from "./passkeys";

const webAuthnError = (code: WebAuthnError["code"], name = "Error") =>
    new WebAuthnError({
        message: "library message",
        code,
        cause: Object.assign(new Error("cause"), { name }),
    });

describe("passkey errors", () => {
    it("treats a closed or aborted prompt as cancelled", () => {
        const notAllowed = Object.assign(new Error("closed"), {
            name: "NotAllowedError",
        });
        expect(isPasskeyCancelled(notAllowed)).toBe(true);
        expect(
            isPasskeyCancelled(
                webAuthnError(
                    "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
                    "NotAllowedError",
                ),
            ),
        ).toBe(true);
        expect(
            isPasskeyCancelled(webAuthnError("ERROR_CEREMONY_ABORTED")),
        ).toBe(true);
        expect(
            isPasskeyCancelled(
                webAuthnError(
                    "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED",
                    "InvalidStateError",
                ),
            ),
        ).toBe(false);
    });

    it("explains the errors users can fix", () => {
        expect(
            passkeyErrorMessage(
                webAuthnError("ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"),
            ),
        ).toBe("This device already has a passkey for your account.");
        expect(
            passkeyErrorMessage(
                webAuthnError(
                    "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT",
                ),
            ),
        ).toContain("cannot store passkeys");
        expect(
            passkeyErrorMessage(webAuthnError("ERROR_INVALID_RP_ID")),
        ).toContain("APP_URL");
        expect(
            passkeyErrorMessage(
                webAuthnError("ERROR_AUTHENTICATOR_GENERAL_ERROR"),
            ),
        ).toBe("library message");
        expect(passkeyErrorMessage("nope")).toBe("Unknown error");
    });
});
