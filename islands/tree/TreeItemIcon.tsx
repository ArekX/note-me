import { RecordContainer } from "$islands/tree/hooks/record-container.ts";
import Icon from "$components/Icon.tsx";

interface TreeItemIconProps {
    addClass?: string;
    container: RecordContainer;
}

export default function TreeItemIcon(
    { container, addClass }: TreeItemIconProps,
) {
    return (
        <div class={`relative inline-block ${addClass}`}>
            {container.is_protected && (
                <div class="absolute -bottom-1 right-0">
                    <Icon
                        name="lock-alt"
                        type="solid"
                        size="sm"
                    />
                </div>
            )}
            <Icon
                name={container.type == "group"
                    ? `folder${container.is_open ? "-open" : ""}`
                    : "file"}
                type={container.type == "group" &&
                        container.has_children
                    ? "solid"
                    : "regular"}
            />
        </div>
    );
}
