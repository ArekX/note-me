import { Head } from "$fresh/runtime.ts";
import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { AppState } from "../types/app-state.ts";

export const handler = (_req: Request, ctx: FreshContext<AppState>) => {
    if (ctx.error instanceof Deno.errors.PermissionDenied) {
        return ctx.render({}, {
            status: 403,
        });
    }
    return ctx.render();
};

export default function Error500({ error }: PageProps) {
    const statusCode = (error instanceof Deno.errors.PermissionDenied)
        ? 403
        : 500;
    const message = (error instanceof Deno.errors.PermissionDenied)
        ? "Permission Denied"
        : "Internal Server Error";
    return (
        <>
            <Head>
                <title>{statusCode} - {message}</title>
            </Head>
            <div class="px-4 py-8 mx-auto bg-[#86efac]">
                <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
                    <img
                        class="my-6"
                        src="/logo.svg"
                        width="128"
                        height="128"
                        alt="the Fresh logo: a sliced lemon dripping with juice"
                    />
                    <h1 class="text-4xl font-bold">{statusCode} - {message}</h1>
                    <p class="my-4">
                        {(error as Error).message}
                    </p>
                    <a href="/" class="underline">Go back home</a>
                </div>
            </div>
        </>
    );
}
