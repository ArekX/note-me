import {
    AuthenticationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
} from "$backend/deps.ts";
import { startAuthentication } from "$frontend/deps.ts";
import { useSignal } from "@preact/signals";

interface PasskeySignInProps {
    request_id: string;
    options: PublicKeyCredentialRequestOptionsJSON;
}

export default function PasskeySignIn({
    options,
    request_id,
}: PasskeySignInProps) {
    const passkeyResult = useSignal<AuthenticationResponseJSON | null>(null);

    const handleSignIn = async () => {
        passkeyResult.value = await startAuthentication(options);
    };

    return (
        <div class="text-center py-2">
            <span class="underline cursor-pointer" onClick={handleSignIn}>
                or sign in with passkey
            </span>
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
