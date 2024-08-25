import {
    AuthenticationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "$backend/deps.ts";
import {
    browserSupportsWebAuthn,
    startAuthentication,
} from "$frontend/deps.ts";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import { addMessage } from "$frontend/toast-message.ts";

interface PasskeySignInProps {
    request_id: string;
    options: PublicKeyCredentialRequestOptionsJSON;
}

export default function PasskeySignIn({
    options,
    request_id,
}: PasskeySignInProps) {
    const passkeyResult = useSignal<AuthenticationResponseJSON | null>(null);
    const passkeyLoader = useLoader();

    const handleSignIn = passkeyLoader.wrap(async () => {
        try {
            passkeyResult.value = await startAuthentication(options);
        } catch (e) {
            passkeyResult.value = null;

            if (e instanceof Error && e.name === "AbortError") {
                return;
            }

            addMessage({
                type: "error",
                text: `Passkey sign in failed: ${e.message ?? "Unknown error"}`,
            });
        }
    });

    if (IS_BROWSER && !browserSupportsWebAuthn()) {
        return null;
    }

    return (
        <div class="text-center">
            {!passkeyLoader.running && (
                <Button
                    type="submit"
                    color="success"
                    addClass="md:mr-2 max-md:block max-md:w-full mb-2"
                >
                    <Icon name="log-in" /> Sign in
                </Button>
            )}

            <Button
                onClick={handleSignIn}
                addClass="max-md:w-full max-md:block"
            >
                {passkeyLoader.running
                    ? (
                        <Loader color="white" size="mdButton">
                            Waiting...
                        </Loader>
                    )
                    : (
                        <>
                            <Icon name="user" />Sign in with Passkey
                        </>
                    )}
            </Button>
            {passkeyResult.value && (
                <>
                    <input
                        type="hidden"
                        name="passkey_request_id"
                        value={request_id}
                    />
                    <input
                        type="hidden"
                        name="passkey_authentication_data"
                        value={JSON.stringify(passkeyResult.value)}
                    />
                    <button
                        ref={(el) => el?.click()}
                        type="submit"
                        name="passkey_sign_in"
                        class="hidden"
                    >
                    </button>
                </>
            )}
        </div>
    );
}
