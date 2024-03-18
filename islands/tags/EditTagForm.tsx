import { useSignal } from "@preact/signals";
import Dialog from "$islands/Dialog.tsx";
import { Input } from "$components/Input.tsx";
import { Button } from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { DropdownList } from "$components/DropdownList.tsx";
import { roleDropDownList } from "$backend/rbac/role-definitions.ts";
import { getUserData } from "$frontend/user-data.ts";
import { createTag, createUser, updateTag, updateUser } from "$frontend/api.ts";
import { supportedTimezoneList } from "$backend/time.ts";

export interface EditableTag {
    id: number | null;
    name: string;
}

interface EditTagFormProps {
    editTag: EditableTag | null;
    onDone: (reason: "ok" | "cancel") => void;
}

export function EditTagForm(
    { editTag, onDone }: EditTagFormProps,
) {
    const tag = useSignal<EditableTag>({ ...editTag } as EditableTag);

    useEffect(() => {
        tag.value = { ...editTag } as EditableTag;
    }, [editTag]);

    const setProperty = (name: keyof EditableTag) => (value: string) => {
        tag.value = { ...tag.value, [name]: value };
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();

        const { id, name } = tag.value;

        if (id === null) {
            await createTag({ name });
        } else {
            await updateTag(+id, { name });
        }

        onDone("ok");
    };

    return (
        <Dialog visible={editTag !== null}>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <Input
                        label="Name"
                        type="text"
                        value={tag.value.name}
                        onInput={setProperty("name")}
                    />
                </div>
                <Button type="submit" color="success">Save</Button>{" "}
                <Button onClick={() => onDone("cancel")}>Cancel</Button>
            </form>
        </Dialog>
    );
}
