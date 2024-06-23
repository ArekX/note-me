import { NodeProps } from "$islands/markdown/NodeItem.tsx";

export const getHeadingId = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
        /^-+|-+$/g,
        "",
    );

const createHeadingId = (el: unknown) => {
    const element = el as HTMLElement;
    if (element) {
        element.setAttribute(
            "id",
            getHeadingId(element.textContent ?? ""),
        );
    }
};

export default function Heading({ node, children }: NodeProps<"heading">) {
    const props = {
        ref: createHeadingId,
    };

    switch (node.data.level) {
        case 1:
            return (
                <h1 {...props}>
                    {children}
                </h1>
            );
        case 2:
            return (
                <h2 {...props}>
                    {children}
                </h2>
            );
        case 3:
            return (
                <h3 {...props}>
                    {children}
                </h3>
            );
        case 4:
            return (
                <h4 {...props}>
                    {children}
                </h4>
            );
        case 5:
            return (
                <h5 {...props}>
                    {children}
                </h5>
            );
        default:
            return (
                <h6 {...props}>
                    {children}
                </h6>
            );
    }
}
