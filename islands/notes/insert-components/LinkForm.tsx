import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";

interface LinkFormProps {
    iconName: string;
    onInsert: (name: string, url: string) => void;
    onCancel: () => void;
}

export default function LinkForm({
    iconName,
    onCancel,
    onInsert,
}: LinkFormProps) {
    const link = useSignal<string>("");
    const linkName = useSignal<string>("");

    const handleInsert = () => onInsert(linkName.value, link.value);

    return (
        <div class="w-1/2">
            <Input
                label="Link"
                labelColor="white"
                value={link.value}
                onInput={(v) => link.value = v}
            />

            <Input
                label="Name"
                labelColor="white"
                value={linkName.value}
                onInput={(v) => linkName.value = v}
            />

            <div class="mt-2 flex items-center">
                <div class="mr-2">
                    <Button color="primary" size="md" onClick={handleInsert}>
                        <Icon name={iconName} size="lg" /> Insert
                    </Button>
                </div>

                <div>
                    <Button
                        color="danger"
                        onClick={onCancel}
                        size="md"
                    >
                        <Icon name="minus-circle" size="lg" /> Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
