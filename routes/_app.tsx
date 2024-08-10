import { type PageProps } from "$fresh/server.ts";
import { getCurrentMonthWallpaper } from "$frontend/wallpaper.ts";
import ToastMessages from "$islands/ToastMessages.tsx";

export default function App({ Component, route, data }: PageProps) {
    const allowWallpaper = data?.disableWallpaper !== true;
    const wallpaper = allowWallpaper && route === "/"
        ? getCurrentMonthWallpaper()
        : null;

    const allowScrolling = route.startsWith("/public");
    const subTitle = data?.pageTitle ? `- ${data.pageTitle}` : "";

    return (
        <html>
            <head>
                <meta charset="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <title>NoteMe {subTitle}</title>
                <link
                    rel="stylesheet"
                    href="/boxicons/css/boxicons.min.css"
                />
                <link
                    rel="stylesheet"
                    href="/highlightjs.min.css"
                />
                <link rel="stylesheet" href="/styles.css" />
                <link rel="icon" href="/logo-white.svg"></link>
            </head>
            <body
                class={`bg-gray-900 ${
                    allowScrolling ? "allow-scrolling" : ""
                } bg-cover bg-center`}
                style={wallpaper
                    ? { "background-image": `url(${wallpaper})` }
                    : {}}
            >
                <Component />
                <ToastMessages />
                <div id="icon-menu"></div>
            </body>
        </html>
    );
}
