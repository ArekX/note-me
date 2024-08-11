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
                .map(([id, name], index, total) => (
                    <Button
                        color={activeItem === id ? "success" : "primary"}
                        onClick={() =>
                            activeItem !== id ? onSelect?.(id) : null}
                        rounded={false}
                        borderClass={`${
                            index === 0 ? "border-l rounded-l-lg" : ""
                        } ${
                            index === total.length - 1
                                ? "border-r rounded-r-lg"
                                : ""
                        } border-t ${
                            id === activeItem ? "pointer-events-none" : ""
                        } ${id === activeItem ? "border-l border-r" : ""}`}
                    >
                        {name}
                    </Button>
                ))}
        </div>
    );
}
