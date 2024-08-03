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
        } catch {
            passkeyResult.value = null;
        }
    });

    if (IS_BROWSER && !browserSupportsWebAuthn()) {
        return null;
    }

    return (
        <div class="text-center py-2">
            <Button onClick={handleSignIn}>
                {passkeyLoader.running
                    ? <Loader color="white">Waiting...</Loader>
                    : (
                        <>
                            <Icon name="user" />Sign in with passkey
                        </>
                    )}
            </Button>
            {passkeyResult.value && (
                <form
                    ref={(ref) => {
                        if (ref) {
                            ref.submit();
                        }
                    }}
                    method="POST"
                    action="/"
                >
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
                </form>
            )}
        </div>
    );
}