import Button from "$components/Button.tsx";
import { ListMap } from "$frontend/hooks/use-list-state.ts";

interface ButtonGroupProps<T extends ListMap> {
    activeItem?: keyof T | null;
    items: T;
    visibleItems?: (keyof T)[];
    onSelect?: (itemId: keyof T) => void;
}

export default function ButtonGroup<T extends ListMap>(
    { items, onSelect, activeItem, visibleItems }: ButtonGroupProps<T>,
) {
    return (
        <div>
            {Object.entries(items)
                .filter((item) => {
                    if (!visibleItems) {
                        return true;
                    }
                    return visibleItems.includes(item[0]);
                })
                .map(([id, name]) => (
                    <Button
                        color={activeItem === id ? "success" : "primary"}
                        onClick={() => onSelect?.(id)}
                        addClass="mr-2"
                    >
                        {name}
                    </Button>
                ))}
        </div>
    );
}
