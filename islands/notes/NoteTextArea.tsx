import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { Compartment, EditorState, EditorView } from "$frontend/deps.ts";
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
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    SearchNoteMessage,
    SearchNoteResponse,
} from "$workers/websocket/api/notes/messages.ts";
import {
    GetTreeMessage,
    GetTreeResponse,
} from "$workers/websocket/api/tree/messages.ts";
import { createNoteEditorExtensions } from "./codemirror/setup.ts";
import { createExtensionCompletion } from "./codemirror/extension-autocomplete.ts";

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
            description:
                "Insert link template. If selected text is a URL, it will be used as the link target otherwise it will be used as the link text",
        },
        {
            identifier: "insertImage",
            metaKeys: ["ctrl"],
            key: "p",
            description:
                "Insert image template. If selected text is a URL, it will be used as the image source otherwise it will be used as the image alt text",
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
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const editableCompartmentRef = useRef(new Compartment());
    const currentText = useSignal(initialText);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const fileUploader = useFileUploader();
    const { sendMessage } = useWebsocketService();

    const insertAtCursor = (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: from + text.length },
            userEvent: "input.paste",
        });
        view.focus();
    };

    const uploadAndInsertFiles = async (files: File[]) => {
        const results = await fileUploader.uploadFiles(files);
        const toInsert: string[] = [];

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

        insertAtCursor(toInsert.join("\n"));
    };

    const uploadRef = useRef(uploadAndInsertFiles);
    uploadRef.current = uploadAndInsertFiles;

    useEffect(() => {
        if (!containerRef.current || viewRef.current) return;

        const completion = createExtensionCompletion({
            searchNotes: async (query: string) => {
                const response = await sendMessage<
                    SearchNoteMessage,
                    SearchNoteResponse
                >("notes", "searchNote", {
                    data: {
                        filters: {
                            type: "general",
                            query,
                        },
                    },
                    expect: "searchNoteResponse",
                });
                return response.results;
            },
            loadGroups: async () => {
                const response = await sendMessage<
                    GetTreeMessage,
                    GetTreeResponse
                >("tree", "getTree", {
                    data: { item_type: "group" },
                    expect: "getTreeResponse",
                });
                return response.records;
            },
        });

        const extensions = createNoteEditorExtensions({
            hotkeySet: noteTextAreaHotkeySet,
            completion,
            onChange: (text) => {
                currentText.value = text;
                onChangeRef.current(text);
            },
            onPasteFiles: (files) => {
                uploadRef.current(files);
            },
            tabIndex: 3,
            editableCompartment: editableCompartmentRef.current,
            initialEditable: !isSaving,
        });

        const view = new EditorView({
            state: EditorState.create({
                doc: initialText,
                extensions,
            }),
            parent: containerRef.current,
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            effects: editableCompartmentRef.current.reconfigure(
                EditorView.editable.of(!isSaving),
            ),
        });
    }, [isSaving]);

    return (
        <div class="flex-grow block basis-auto">
            <FileDropWrapper
                wrapperClass="w-full block"
                onFilesDropped={uploadAndInsertFiles}
            >
                <div
                    ref={containerRef}
                    class="text-editor block w-full"
                />
            </FileDropWrapper>
            <UploadProgressDialog uploader={fileUploader} />
            <InsertDialog
                noteText={currentText.value}
                onInsert={insertAtCursor}
            />
        </div>
    );
}
