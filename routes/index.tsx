import Logo from "../components/Logo.tsx";
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import {
    createSessionState,
    writeSessionCookie,
} from "$backend/session/mod.ts";
import { AppSessionData, AppState } from "$types";
import Alert from "$components/Alert.tsx";
import Icon from "$components/Icon.tsx";
import { getUserByLogin } from "$backend/repository/user-repository.ts";
import Button from "$components/Button.tsx";
import Input from "$components/Input.tsx";
import InvalidateData from "$islands/InvalidateData.tsx";

interface LoginResult {
    username: string;
    message: string;
}

export const handler: Handlers<LoginResult> = {
    GET(_req, ctx: FreshContext<AppState>) {
        if (ctx.state.session?.data) {
            return new Response("", {
                status: 302,
                headers: { Location: "/app" },
            });
        }

        return ctx.render({ username: "", message: "" });
    },
    async POST(req, ctx: FreshContext<AppState>) {
        const form = await req.formData();

        const user = await getUserByLogin(
            form.get("username")?.toString() ?? "",
            form.get("password")?.toString() ?? "",
        );

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
                </form>
                <InvalidateData />
            </div>
        </div>
    );
}
