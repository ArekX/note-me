import { Head, Partial } from "fresh/runtime";
import { FreshContext, HttpError, page, PageProps } from "fresh";
import { AppState } from "../types/app-state.ts";

export const handler = (ctx: FreshContext<AppState>) => {
    if (ctx.error instanceof Deno.errors.PermissionDenied) {
        return page({
            disableWallpaper: true,
        }, {
            status: 403,
        });
    }

    return page();
};

const NotFoundPage = () => (
    <Partial name="body">
        <div class="px-4 py-8 mx-auto bg-[#86efac]">
            <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
                <img
                    class="my-6"
                    src="/logo-white.svg"
                    width="128"
                    height="128"
                    alt="NoteMe"
                />

                <h1 class="text-4xl font-bold">Page not found</h1>
                <p class="my-4">
                    The page you were looking for doesn't exist.
                </p>
                <a href="javascript:history.back();" class="underline">
                    Go back
                </a>
            </div>
        </div>
    </Partial>
);

export default function ErrorPage({ error }: PageProps) {
    if (error instanceof HttpError && error.status === 404) {
        return (
            <>
                <Head>
                    <title>404 - Page not found</title>
                </Head>
                <NotFoundPage />
            </>
        );
    }

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
