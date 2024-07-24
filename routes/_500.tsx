import { Head, Partial } from "$fresh/runtime.ts";
import { FreshContext, PageProps } from "$fresh/server.ts";
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
            <Partial name="body">
                <div class="px-4 py-8 mx-auto text-white">
                    <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
                        <img
                            class="my-6"
                            src="/logo-white.svg"
                            width="128"
                            height="128"
                            alt="NoteMe"
                        />

                        <h1 class="text-4xl font-bold">
                            {message} ({statusCode})
                        </h1>

                        <div class="border-2 py-2 px-8 my-4 border-red-800 bg-red-950">
                            <p class="my-4">
                                {(error as Error).message}
                            </p>
                        </div>

                        <a href="javascript:history.back();" class="underline">
                            Go back
                        </a>
                    </div>
                </div>
            </Partial>
        </>
    );
}
