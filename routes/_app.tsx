import { type PageProps } from "$fresh/server.ts";

const MATERIAL_STYLE = `
.material-symbols-outlined {
            font-variation-settings:
            'FILL' 0,
            'wght' 400,
            'GRAD' 200,
            'opsz' 48
          }
`;

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NoteMe</title>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <style>{MATERIAL_STYLE}</style>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" href="/logo.svg"></link>
      </head>
      <body class="bg-gray-900">
        <Component />
      </body>
    </html>
  );
}
