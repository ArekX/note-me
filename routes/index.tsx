import Logo from "../components/Logo.tsx";
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import {
    createSessionState,
    writeSessionCookie,
} from "$backend/session/mod.ts";
import { AppSessionData, AppState } from "$types";
import Alert from "$components/Alert.tsx";
import Icon from "$components/Icon.tsx";
import {
    getUserById,
    getUserByLogin,
    UserLoginRecord,
} from "$backend/repository/user-repository.ts";
import Button from "$components/Button.tsx";
import Input from "$components/Input.tsx";
import InvalidateData from "$islands/InvalidateData.tsx";
import { checkLoginAttempt } from "$backend/bruteforce-login-protector.ts";
import {
    AuthenticationResponseJSON,
    AuthenticatorTransportFuture,
    generateAuthenticationOptions,
    PublicKeyCredentialRequestOptionsJSON,
    verifyAuthenticationResponse,
} from "$backend/deps.ts";
import { getRelyingPartyId, getRelyingPartyOrigin } from "$backend/env.ts";
import PasskeySignIn from "$islands/PasskeySignIn.tsx";
import { getPasskeyById } from "$backend/repository/passkey-repository.ts";

interface LoginResult {
    username: string;
    message: string;
    passkey_request_id: string;
    options: PublicKeyCredentialRequestOptionsJSON;
}

const requests = new Map<string, PublicKeyCredentialRequestOptionsJSON>();

export const handler: Handlers<LoginResult> = {
    async GET(_req, ctx: FreshContext<AppState>) {
        if (ctx.state.session?.data) {
            return new Response("", {
                status: 302,
                headers: { Location: "/app" },
            });
        }

        const options: PublicKeyCredentialRequestOptionsJSON =
            await generateAuthenticationOptions({
                rpID: getRelyingPartyId(),
            });

        const passkeyRequestId = crypto.randomUUID();

        requests.set(passkeyRequestId, options);

        return ctx.render({
            username: "",
            message: "",
            options,
            passkey_request_id: passkeyRequestId,
        });
    },
    async POST(req, ctx: FreshContext<AppState>) {
        checkLoginAttempt(req, ctx);

        const form = await req.formData();

        let user: UserLoginRecord | null;

        if (form.has("passkey_request_id")) {
            const passkeyRequestId = form.get("passkey_request_id")?.toString();

            if (!passkeyRequestId) {
                return new Response("Invalid passkey request id", {
                    status: 400,
                });
            }

            const options = requests.get(passkeyRequestId);

            if (!options) {
                return new Response("Invalid passkey request id", {
                    status: 400,
                });
            }

            requests.delete(passkeyRequestId);

            const authenticationData: AuthenticationResponseJSON = JSON.parse(
                form.get("passkey_authentication_data")?.toString() ?? "{}",
            );

            const passkey = await getPasskeyById(authenticationData.id);

            if (!passkey) {
                return ctx.render({
                    message:
                        "No passkey stored for this device or invalid passkey.",
                    username: "",
                });
            }

            const result = await verifyAuthenticationResponse({
                response: authenticationData,
                expectedChallenge: options.challenge,
                expectedOrigin: getRelyingPartyOrigin(),
                expectedRPID: getRelyingPartyId(),
                authenticator: {
                    credentialID: passkey.credential_identifier,
                    credentialPublicKey: passkey.public_key,
                    counter: passkey.counter,
                    transports: passkey.transports.split(
                        ",",
                    ) as unknown as AuthenticatorTransportFuture[],
                },
            });

            if (!result.verified) {
                return ctx.render({
                    message:
                        "No passkey stored for this device or invalid passkey.",
                    username: "",
                });
            }

            user = await getUserById(passkey.user_id);
        } else {
            user = await getUserByLogin(
                form.get("username")?.toString() ?? "",
                form.get("password")?.toString() ?? "",
            );
        }

        if (!user) {
            return ctx.render({
                message: "Invalid username or password",
                username: form.get("username")?.toString() ?? "",
            });
        }

        const response = new Response("", {
            status: 302,
            headers: { Location: "/app" },
        });

        writeSessionCookie(
            req.headers,
            response.headers,
            await createSessionState<AppSessionData>(user.id, {
                user,
                storedCsrfToken: ctx.state.newCsrfToken ?? "",
            }),
        );

        return response;
    },
};

export default function Page(props: PageProps<LoginResult>) {
    return (
        <div class="flex items-center xl:justify-end justify-center h-screen">
            <div class="bg-gray-800 text-white drop-shadow-lg rounded-xl px-10 pt-6 pb-8 mb-4 xl:mr-20 bg-opacity-95">
                <div class="text-center mb-5">
                    <Logo white={true} />
                </div>
                <form method="POST" action="/">
                    <h1 class="mb-5 text-lg text-center">
                        Welcome to <strong>NoteMe</strong>! Please login.
                    </h1>
                    <Alert message={props.data?.message} />
                    <div class="mb-5">
                        <Input
                            label="Username"
                            icon="user"
                            placeholder="Username"
                            name="username"
                            value={props.data?.username}
                        />
                    </div>
                    <div class="mb-5">
                        <Input
                            label="Password"
                            icon="key"
                            placeholder="Password"
                            type="password"
                            name="password"
                        />
                    </div>
                    <div class="flex items-center justify-center mt-8s\">
                        <Button type="submit" color="success">
                            <span class="pr-2">
                                <Icon name="log-in" />
                            </span>{" "}
                            Log Me In
                        </Button>
                    </div>
                    <PasskeySignIn
                        request_id={props.data.passkey_request_id}
                        options={props.data.options}
                    />
                </form>
                <InvalidateData />
            </div>
        </div>
    );
}
