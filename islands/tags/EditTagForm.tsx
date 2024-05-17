import { useSignal } from "@preact/signals";
import Dialog from "$islands/Dialog.tsx";
import { Input } from "$components/Input.tsx";
import { Button } from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    CreateTagMessage,
    CreateTagResponse,
    UpdateTagMessage,
    UpdateTagResponse,
} from "$workers/websocket/api/tags/messages.ts";

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

    const { sendMessage } = useWebsocketService();

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
            await sendMessage<CreateTagMessage, CreateTagResponse>(
                "tags",
                "createTag",
                {
                    data: {
                        data: {
                            name,
                        },
                    },
                    "expect": "createTagResponse",
                },
            );
        } else {
            await sendMessage<UpdateTagMessage, UpdateTagResponse>(
                "tags",
                "updateTag",
                {
                    data: {
                        id: +id,
                        data: { name },
                    },
                    "expect": "updateTagResponse",
                },
            );
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
