import { BlockProps } from "$islands/viewer/renderer.tsx";

export default function Text({ node }: BlockProps<"text">) {
    return <span>{node.content}</span>;
}
