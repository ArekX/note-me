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

const wallpapersPerMonth = {
  1: '/wallpapers/winter1.jpg',
  2: '/wallpapers/winter1.jpg',
  3: '/wallpapers/spring1.jpg',
  4: '/wallpapers/spring1.jpg',
  5: '/wallpapers/spring1.jpg',
  6: '/wallpapers/summer1.jpg',
  7: '/wallpapers/summer1.jpg',
  8: '/wallpapers/summer1.jpg',
  9: '/wallpapers/autumn1.jpg',
  10: '/wallpapers/autumn1.jpg',
  11: '/wallpapers/autumn1.jpg',
  12: '/wallpapers/winter1.jpg'
}

export default function App({ Component, route }: PageProps) {

  const month = new Date().getMonth() + 1 as keyof typeof wallpapersPerMonth;
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NoteMe</title>
        <link
          rel="stylesheet"
          href="/boxicons/css/boxicons.min.css"
        />
        <style>{MATERIAL_STYLE}</style>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" href="/logo.svg"></link>
      </head>
      <body class="bg-gray-900" style={{ 'background-image': `url(${wallpapersPerMonth[month]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Component />
        <div id="icon-menu"></div>
      </body>
    </html>
  );
}
