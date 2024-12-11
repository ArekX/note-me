import Logo from "../components/Logo.tsx";
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import {
    createSessionState,
    writeSessionCookie,
} from "$backend/session/mod.ts";
import { AppSessionData, AppState } from "$types";
import Alert from "$components/Alert.tsx";
import { UserLoginRecord } from "$backend/repository/user-repository.ts";
import Input from "$components/Input.tsx";
import InvalidateData from "$islands/InvalidateData.tsx";
import { checkLoginAttempt } from "$backend/bruteforce-login-protector.ts";
import { AuthenticationResponseJSON } from "$backend/deps.ts";
import PasskeySignIn from "$islands/PasskeySignIn.tsx";
import {
    finalizePasskeyAuthentication,
    initializePasskeyAuthentication,
    PasskeyAuthenticationRequestData,
} from "$backend/passkeys.ts";
import { repository } from "$workers/database/lib.ts";

interface LoginResult {
    username: string;
    message: string;
    passkey_request: PasskeyAuthenticationRequestData;
}

const renderSignIn = async (
    ctx: FreshContext<AppState, LoginResult>,
    message: string = "",
    username: string = "",
) => {
    return ctx.render({
        username,
        message,
        passkey_request: await initializePasskeyAuthentication(),
    });
};

export const handler: Handlers<LoginResult> = {
    async GET(_req, ctx: FreshContext<AppState, LoginResult>) {
        if (ctx.state.session?.data) {
            return new Response("", {
                status: 302,
                headers: { Location: "/app" },
            });
        }

        return await renderSignIn(ctx);
    },
    async POST(req, ctx: FreshContext<AppState, LoginResult>) {
        checkLoginAttempt(req, ctx);

        const form = await req.formData();

        let user: UserLoginRecord | null;

        if (form.has("passkey_request_id")) {
            const passkeyRequestId = form.get("passkey_request_id")?.toString();

            if (!passkeyRequestId) {
                return await renderSignIn(ctx, "Invalid passkey request.");
            }

            const authenticationData: AuthenticationResponseJSON = JSON.parse(
                form.get("passkey_authentication_data")?.toString() ?? "{}",
            );

            const result = await finalizePasskeyAuthentication(
                passkeyRequestId,
                authenticationData,
            );

            if (!result.verified) {
                return await renderSignIn(
                    ctx,
                    "Could not verify your passkey, make sure it is registered to your account.",
                );
            }

            user = await repository.user.getUserById(result.user_id!);
        } else {
            user = await repository.user.getUserByLogin({
                username: form.get("username")?.toString() ?? "",
                password: form.get("password")?.toString() ?? "",
            });
        }

        if (!user) {
            return await renderSignIn(
                ctx,
                "Invalid username or password.",
                form.get("username")?.toString() ?? "",
            );
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
        <div class="flex items-center lg:justify-end justify-center h-screen text-white ">
            <div class="bg-gray-900/90 h-full px-10 pt-10 w-1/3 backdrop-blur-xl max-w-lg max-lg:min-w-full overflow-auto">
                <div class="text-center mb-5">
                    <Logo white={true} width={96} height={96} />
                </div>
                <form method="POST" action="/">
                    <h1 class="mb-5 text-lg text-center">
                        <span class="text-2xl">
                            Welcome to <strong>NoteMe</strong>
                        </span>
                        <br />
                        <span class="text-gray-400 text-sm">
                            Please sign in to continue
                        </span>
                    </h1>
                    <Alert message={props.data?.message} />
                    <div class="w-2/3 m-auto">
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
                    </div>
                    <div class="flex items-center justify-center mt-8 flex-wrap max-md:pb-36 md:pb-5">
                        <PasskeySignIn
                            request_id={props.data.passkey_request.request_id}
                            options={props.data.passkey_request.options}
                        />
                    </div>
                </form>
                <InvalidateData />
            </div>
        </div>
    );
}
