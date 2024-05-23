import Input from "../Input.tsx";

interface InputFilterProps<T extends object> {
    filters: T;
    filterKey: keyof T;
    onChange: (filters: T) => void;
}

export default function TextFilter<T extends object>(
    { filters, filterKey, onChange }: InputFilterProps<T>,
) {
    return (
        <Input
            value={filters[filterKey] as string ?? ""}
            onInput={(value) => {
                onChange({ ...filters, [filterKey]: value });
            }}
        />
    );
}
