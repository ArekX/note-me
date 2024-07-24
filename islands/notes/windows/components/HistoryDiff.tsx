import { useSignal } from "@preact/signals";
import { NoteHistoryDataRecord } from "$backend/repository/note-history-repository.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import {
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { DiffLine, diffText } from "$frontend/diff.ts";
import { getFormattedTagString } from "$frontend/tags.ts";
import {
    NoteTextHook,
    useNoteText,
} from "$islands/notes/hooks/use-note-text.ts";
import ProtectedAreaWrapper from "$islands/encryption/ProtectedAreaWrapper.tsx";

interface HistoryDiffProps {
    id: number;
    noteText: NoteTextHook;
    showType: ShowNoteType;
}

export type ShowNoteType = "note" | "diff";

export default function HistoryDiff({
    id,
    noteText,
    showType,
}: HistoryDiffProps) {
    const { sendMessage } = useWebsocketService();
    const loader = useLoader(true);
    const data = useSignal<NoteHistoryDataRecord | null>(null);
    const historyNoteText = useNoteText({
        initialData: {
            text: "",
            is_encrypted: false,
        },
    });
    const diffLines = useSignal<DiffLine[]>([]);

    const loadHistoryData = loader.wrap(async (id: number) => {
        const response = await sendMessage<
            GetNoteHistoryDataMessage,
            GetNoteHistoryDataResponse
        >(
            "notes",
            "getNoteHistoryData",
            {
                data: {
                    id,
                },
                expect: "getNoteHistoryDataResponse",
            },
        );

        historyNoteText.setInputData({
            text: response.data.note,
            is_encrypted: response.data.is_encrypted,
        });

        const note = await noteText.getText();

        data.value = {
            ...response.data,
            note: (await historyNoteText.getText())!,
        };

        if (note) {
            diffLines.value = diffText(data.value.note, note);
        }
    });

    useEffect(() => {
        loadHistoryData(id);
    }, [id]);

    return (
        <ProtectedAreaWrapper
            requirePassword={historyNoteText.isEncrypted() ||
                noteText.isEncrypted()}
        >
            <div class="p-4">
                {loader.running ? <Loader color="white" /> : data.value && (
                    <>
                        <h2 class="text-xl">{data.value.title}</h2>
                        <h4 class="text-lg">
                            {getFormattedTagString(
                                data.value.tags.replace(/,/g, " "),
                            )}
                        </h4>
                        {showType === "note"
                            ? (
                                <pre class="text-sm whitespace-pre-wrap">{data.value?.note}</pre>
                            )
                            : (
                                <pre class="diff-viewer text-sm whitespace-pre-wrap">
                        {diffLines.value.map((line, index) => {
                            switch (line.type) {
                                case "added":
                                    return (
                                        <div class="diff-added" key={index}>
                                            {line.value}
                                        </div>
                                    );
                                case "removed":
                                    return (
                                        <div class="diff-removed" key={index}>
                                            {line.value}
                                        </div>
                                    );
                                case "same":
                                    return (
                                        <div class="diff-unchanged" key={index}>
                                            {line.value}
                                        </div>
                                    );
                                case "changed":
                                    return (
                                        <div
                                            class="diff-changed"
                                            key={index}
                                            title={`From: ${line.from}`}
                                        >
                                            {line.to}
                                        </div>
                                    );
                            }
                        })}
                                </pre>
                            )}
                    </>
                )}
            </div>
        </ProtectedAreaWrapper>
    );
}
