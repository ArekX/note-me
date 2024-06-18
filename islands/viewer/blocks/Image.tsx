import { BlockProps } from "$islands/viewer/renderer.tsx";

export default function Image({ node }: BlockProps<"image">) {
    return (
        <img
            src={node.url}
            alt={node.title}
        />
    );
}
