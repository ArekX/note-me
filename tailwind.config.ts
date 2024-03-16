import { type Config } from "tailwindcss";

export default {
    content: [
        "{routes,islands,components}/**/*.{ts,tsx}",
    ],
    safelist: [
        "text-xl",
        "text-2xl",
        "text-3xl",
        "text-4xl",
        "text-5xl",
        "text-sm",
        "text-md",
        "text-lg",
    ],
} satisfies Config;
