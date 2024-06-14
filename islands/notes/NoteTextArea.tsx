import { useSignal } from "@preact/signals";
import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { autosize, insertTextIntoField } from "$frontend/deps.ts";
import InsertDialog from "$islands/notes/InsertDialog.tsx";

interface NoteInputProps {
    isSaving: boolean;
    initialText: string;
    onChange: (text: string) => void;
}

export default function NoteTextArea({
    isSaving,
    initialText,
    onChange,
}: NoteInputProps) {
    const text = useSignal(initialText);
    const lastCursorPosition = useSignal(0);
    const textAreaRef = createRef<HTMLTextAreaElement>();

    const handleTextInput = (event: Event) => {
        text.value = (event.target as HTMLInputElement).value;
        onChange(text.value);
    };

    const recordLastCursorPosition = () => {
        if (!textAreaRef.current) {
            return;
        }

        lastCursorPosition.value = textAreaRef.current.selectionStart || 0;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!textAreaRef.current) {
            return;
        }

        lastCursorPosition.value = textAreaRef.current.selectionStart || 0;

        if (e.key === "Tab") {
            insertTextIntoField(textAreaRef.current, "    ");
            e.preventDefault();
            onChange(text.value);
        }
    };

    const handleDialogInsert = (insertedText: string) => {
        const textValue = text.value;
        const cursorPosition = lastCursorPosition.value;

        console.log(
            "Inserting text",
            insertedText,
            "at",
            cursorPosition,
            "in",
            textValue,
        );

        text.value = `${textValue.slice(0, cursorPosition)}${insertedText}${
            textValue.slice(cursorPosition)
        }`;
        console.log(text.value);
        onChange(text.value);
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

    useEffect(() => {
        text.value = initialText;
    }, [initialText]);

    return (
        <div class="flex-grow block basis-auto">
            <InsertDialog
                onInsert={handleDialogInsert}
            />
            <textarea
                ref={textAreaRef}
                class="text-editor block w-full"
                placeholder="Write your note here"
                tabIndex={3}
                disabled={isSaving}
                onMouseUp={recordLastCursorPosition}
                onKeyDown={handleKeyDown}
                onKeyUp={recordLastCursorPosition}
                onInput={handleTextInput}
                value={text}
            />
        </div>
    );
}
