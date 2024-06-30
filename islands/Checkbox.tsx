interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export default function Checkbox({
    checked,
    label,
    onChange,
}: CheckboxProps) {
    return (
        <div class="inline-block">
            <label class="cursor-pointer">
                <input
                    class="mr-2"
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                        onChange((e.target as HTMLInputElement).checked)}
                />
                {label}
            </label>
        </div>
    );
}
