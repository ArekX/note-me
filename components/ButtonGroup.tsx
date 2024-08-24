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
                            index === 0
                                ? "border-l rounded-l-lg max-md:border-r max-md:rounded-tr-lg max-md:rounded-bl-none max-md:border-t"
                                : ""
                        } ${
                            index === total.length - 1
                                ? "border-r rounded-r-lg max-md:border-l max-md:rounded-br-lg max-md:rounded-tr-none max-md:rounded-bl-lg"
                                : ""
                        } border-t ${
                            id === activeItem ? "pointer-events-none" : ""
                        } border-l border-r ${
                            id === activeItem
                                ? ""
                                : "lg:border-l-transparent lg:border-r-transparent"
                        } max-md:block max-md:w-full
                            ${
                            index !== 0 && index !== total.length - 1
                                ? "max-md:border-t"
                                : ""
                        }
                        `}
                    >
                        {name}
                    </Button>
                ))}
        </div>
    );
}
