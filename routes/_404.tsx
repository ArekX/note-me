import { Head, Partial } from "$fresh/runtime.ts";

export default function Error404() {
    return (
        <>
            <Head>
                <title>404 - Page not found</title>
            </Head>
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
        </>
    );
}
