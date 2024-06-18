import Icon from "$components/Icon.tsx";
import { BlockProps } from "$islands/viewer/renderer.tsx";

export default function Checkbox({ node }: BlockProps<"taskListMarker">) {
    return <Icon name={node.checked ? "checkbox-checked" : "checkbox"} />;
}
