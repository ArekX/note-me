import { BlockProps } from "$islands/viewer/renderer.tsx";

export default function Code({ node }: BlockProps<"code">) {
    return <span>{node.content}</span>;
}
