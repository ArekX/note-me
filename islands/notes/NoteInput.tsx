import { useSignal } from "@preact/signals";
import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { autosize, insertTextIntoField } from "$frontend/deps.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";

interface NoteInputProps {
    isSaving: boolean;
    initialText: string;
    onChange: (text: string) => void;
}

export const NoteInput = ({
    isSaving,
    initialText,
    onChange,
}: NoteInputProps) => {
    const text = useSignal(initialText);
    const showInsertDialog = useSignal(false);
    const textAreaRef = createRef<HTMLTextAreaElement>();

    const handleTextInput = (event: Event) => {
        text.value = (event.target as HTMLInputElement).value;
        onChange(text.value);
    };

    const handleTextKeyDown = (e: KeyboardEvent) => {
        if (!textAreaRef.current) {
            return;
        }
        if (e.key === "Tab") {
            insertTextIntoField(textAreaRef.current, "    ");
            e.preventDefault();
            onChange(text.value);
        }
    };

    useEffect(() => {
        if (!textAreaRef.current) {
            return;
        }

        autosize(textAreaRef.current);

        return () => {
            autosize.destroy(textAreaRef.current);
        };
    }, [textAreaRef]);

    return (
        <div class="flex-grow block basis-auto">
            <div class="fixed bottom-5 right-8 opacity-30 hover:opacity-100">
                <Button
                    color="success"
                    title="Insert item"
                    onClick={() => showInsertDialog.value = true}
                >
                    <Icon name="plus" />
                </Button>
                <Dialog
                    visible={showInsertDialog.value}
                    canCancel={true}
                    onCancel={() => showInsertDialog.value = false}
                >
                    Idemo niis
                </Dialog>
            </div>
            <textarea
                ref={textAreaRef}
                class="text-editor block w-full"
                placeholder="Write your note here"
                disabled={isSaving}
                onKeyDown={handleTextKeyDown}
                onInput={handleTextInput}
            >
                {text.value}
            </textarea>
        </div>
    );
};
