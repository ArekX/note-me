import { useSignal } from "@preact/signals";
import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { autosize, insertTextIntoField } from "$frontend/deps.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import { InsertDialog } from "$islands/notes/InsertDialog.tsx";

interface NoteInputProps {
    isSaving: boolean;
    initialText: string;
    onChange: (text: string) => void;
}

export const NoteTextArea = ({
    isSaving,
    initialText,
    onChange,
}: NoteInputProps) => {
    const text = useSignal(initialText);
    const showInsertDialog = useSignal(false);
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

        text.value = `${textValue.slice(0, cursorPosition)}${insertedText}${
            textValue.slice(cursorPosition)
        }`;
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
        const handleHotkeys = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "i") {
                showInsertDialog.value = true;
                e.preventDefault();
            }
        };

        document.addEventListener("keydown", handleHotkeys);

        return () => {
            document.removeEventListener("keydown", handleHotkeys);
        };
    }, []);

    return (
        <div class="flex-grow block basis-auto">
            <InsertDialog
                show={showInsertDialog.value}
                onInsert={handleDialogInsert}
                onShowRequest={(shouldShow) =>
                    showInsertDialog.value = shouldShow}
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
            >
                {text.value}
            </textarea>
        </div>
    );
};
