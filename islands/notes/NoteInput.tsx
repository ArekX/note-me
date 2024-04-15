import { useSignal } from "@preact/signals";
import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { autosize, insertTextIntoField } from "$frontend/deps.ts";

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
        <textarea
            ref={textAreaRef}
            class="text-editor flex-grow block basis-auto"
            placeholder="Write your note here"
            disabled={isSaving}
            tabIndex={3}
            onKeyDown={handleTextKeyDown}
            onInput={handleTextInput}
        >
            {text.value}
        </textarea>
    );
};
