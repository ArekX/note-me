import { type PageProps } from "$fresh/server.ts";
import { getCurrentMonthWallpaper } from "$frontend/wallpaper.ts";

export default function App({ Component, route }: PageProps) {
    const wallpaper = route === "/" ? getCurrentMonthWallpaper() : null;

    return (
        <html>
            <head>
                <meta charset="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                />
                <title>NoteMe</title>
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
                class="bg-gray-900"
                style={wallpaper
                    ? {
                        "background-image": `url(${wallpaper})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }
                    : {}}
            >
                <Component />
                <div id="icon-menu"></div>
            </body>
        </html>
    );
}
