import Button from "$components/Button.tsx";
import { ListMap } from "$frontend/hooks/use-list-state.ts";

interface ButtonGroupProps<T extends ListMap> {
    activeItem?: keyof T | null;
    items: T;
    onSelect?: (itemId: keyof T) => void;
}

export default function ButtonGroup<T extends ListMap>(
    { items, onSelect, activeItem }: ButtonGroupProps<T>,
) {
    return (
        <div>
            {Object.entries(items).map(([id, name]) => (
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
