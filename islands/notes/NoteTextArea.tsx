import { useSignal } from "@preact/signals";
import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { autosize } from "$frontend/deps.ts";
import InsertDialog from "$islands/notes/InsertDialog.tsx";
import { useFileUploader } from "$islands/files/hooks/use-file-uploader.ts";
import { UploadProgressDialog } from "$islands/files/UploadProgressDialog.tsx";
import {
    getFileDownloadUrl,
    getFileViewUrl,
    getImageMarkdown,
    getLinkMarkdown,
} from "$islands/notes/helpers/markdown.ts";
import { FileDropWrapper } from "$islands/files/FileDropWrapper.tsx";
import { HotkeySet } from "$frontend/hotkeys.ts";
import { useTextareaShortcuts } from "$islands/notes/hooks/use-textarea-shortcuts.ts";

export const noteTextAreaHotkeySet: HotkeySet<
    "noteTextArea",
    | "boldText"
    | "italicText"
    | "insertLink"
    | "insertImage"
    | "insertHorizontalRule"
    | "indentRight"
    | "indentLeft"
> = {
    context: "noteTextArea",
    items: [
        {
            identifier: "boldText",
            metaKeys: ["ctrl"],
            key: "b",
            description: "Make text bold",
        },
        {
            identifier: "italicText",
            metaKeys: ["ctrl"],
            key: "i",
            description: "Make text italic",
        },
        {
            identifier: "insertLink",
            metaKeys: ["ctrl"],
            key: "k",
            description: "Insert link template",
        },
        {
            identifier: "insertImage",
            metaKeys: ["ctrl"],
            key: "p",
            description: "Insert image template",
        },
        {
            identifier: "insertHorizontalRule",
            metaKeys: ["ctrl"],
            key: "h",
            description: "Insert horizontal rule",
        },
        {
            identifier: "indentRight",
            metaKeys: ["ctrl"],
            key: "]",
            description: "Indent right",
        },
        {
            identifier: "indentLeft",
            metaKeys: ["ctrl"],
            key: "[",
            description: "Indent left",
        },
    ],
};

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
    const fileUploader = useFileUploader();

    const { keyDownHandler } = useTextareaShortcuts({
        textAreaRef,
        lastCursorPosition,
        text,
    });

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

    const handleDialogInsert = (insertedText: string) => {
        const textValue = text.value;
        const cursorPosition = lastCursorPosition.value;

        text.value = `${textValue.slice(0, cursorPosition)}${insertedText}${
            textValue.slice(cursorPosition)
        }`;

        onChange(text.value);
    };

    const handlePaste = async (e: ClipboardEvent) => {
        if (!e.clipboardData) {
            return;
        }

        const clipboardItems = Array.from(e.clipboardData.items);

        const files = [];

        for (const item of clipboardItems) {
            const file = item.getAsFile();

            if (file) {
                files.push(file);
            }
        }

        if (files.length === 0) {
            return;
        }

        await uploadAndInsertFiles(files);
    };

    const uploadAndInsertFiles = async (files: File[]) => {
        const results = await fileUploader.uploadFiles(files);
        const toInsert = [];

        for (const result of results) {
            if (result.file.type.startsWith("image/")) {
                toInsert.push(
                    getImageMarkdown(
                        getFileViewUrl(result.identifier),
                        result.file.name,
                    ),
                );
            } else {
                toInsert.push(
                    getLinkMarkdown(
                        getFileDownloadUrl(result.identifier),
                        result.file.name,
                    ),
                );
            }
        }

        handleDialogInsert(toInsert.join("\n"));
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
            <FileDropWrapper
                wrapperClass="w-full block"
                onFilesDropped={uploadAndInsertFiles}
            >
                <textarea
                    ref={textAreaRef}
                    class="text-editor block w-full"
                    placeholder="Write your note here"
                    tabIndex={3}
                    disabled={isSaving}
                    onMouseUp={recordLastCursorPosition}
                    onKeyDown={keyDownHandler}
                    onKeyUp={recordLastCursorPosition}
                    onInput={handleTextInput}
                    onPaste={handlePaste}
                    value={text}
                />
            </FileDropWrapper>
            <UploadProgressDialog uploader={fileUploader} />
            <InsertDialog
                noteText={text.value}
                onInsert={handleDialogInsert}
            />
        </div>
    );
}
