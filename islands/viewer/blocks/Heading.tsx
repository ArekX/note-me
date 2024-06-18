import { BlockProps, renderChildren } from "$islands/viewer/renderer.tsx";
import { createElement } from "preact";

export const getHeadingId = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
        /^-+|-+$/g,
        "",
    );

export default function Heading({ node, originalText }: BlockProps<"heading">) {
    return createElement(
        `h${Math.min(6, node.data.level)}`,
        {
            ref: (el: unknown) => {
                const element = el as HTMLElement;
                if (element) {
                    element.setAttribute(
                        "id",
                        getHeadingId(element.textContent ?? ""),
                    );
                }
            },
        },
        renderChildren(node, originalText),
    );
}
