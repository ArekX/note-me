import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import { InsertComponentProps } from "$islands/notes/InsertDialog.tsx";

export interface LinkFormInsertData {
    name: string;
    url: string;
}

export default function LinkForm({
    onInsertDataChange,
}: InsertComponentProps<LinkFormInsertData>) {
    const link = useSignal<string>("");
    const linkName = useSignal<string>("");

    const handleSet = (data: Partial<LinkFormInsertData>) => {
        link.value = data.url ?? link.value;
        linkName.value = data.name ?? linkName.value;
        onInsertDataChange({
            name: linkName.value,
            url: link.value,
        });
    };

    return (
        <div class="w-1/2">
            <Input
                label="Link"
                labelColor="white"
                value={link.value}
                onInput={(v) => handleSet({ url: v })}
            />

            <Input
                label="Name"
                labelColor="white"
                value={linkName.value}
                onInput={(v) => handleSet({ name: v })}
            />
        </div>
    );
}
