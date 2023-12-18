import { Logo } from "../components/Logo.tsx";
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import {
  createSessionState,
  writeSessionCookie,
} from "$backend/session/mod.ts";
import { AppSessionData, AppState } from "$types/app-state.ts";
import { Alert } from "$components/Alert.tsx";
import { Icon } from "$components/Icon.tsx";
import { getUserByLogin } from "$repository";

interface LoginResult {
  username: string;
  message: string;
}

export const handler: Handlers<LoginResult> = {
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
      response.headers,
      await createSessionState<AppSessionData>({ user }),
    );

    return response;
  },
};

export default function Page(props: PageProps<LoginResult>) {
  return (
    <div class="flex items-center justify-center h-screen">
      <div class="bg-white shadow-md rounded px-10 pt-6 pb-8 mb-4">
        <div class="text-center mb-5">
          <Logo />
        </div>
        <form method="POST" action="/">
          <h1 class="mb-5 text-lg text-center">
            Welcome to <strong>NoteMe</strong>! Please login.
          </h1>
          <Alert message={props.data?.message} />
          <div class="mb-5">
            <label
              class="block text-gray-700 text-sm font-bold mb-2"
              for="username"
            >
              Username
            </label>
            <input
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="username"
              type="text"
              name="username"
              placeholder="Username"
              value={props.data?.username}
            />
          </div>
          <div class="mb-5">
            <label
              class="block text-gray-700 text-sm font-bold mb-2"
              for="password"
            >
              Password
            </label>
            <input
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              name="password"
              placeholder="Password"
            />
          </div>
          <div class="flex items-center justify-center">
            <button
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              <Icon name="login" /> Log Me In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
