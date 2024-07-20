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
import { diffText } from "$frontend/diff.ts";
import { getFormattedTagString } from "$frontend/tags.ts";
import DecryptionTextWrapper from "$islands/encryption/DecryptionTextWrapper.tsx";

interface HistoryDiffProps {
    id: number;
    noteText: string;
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

    const diffLines = data.value ? diffText(noteText, data.value.note) : [];

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

        data.value = response.data;
    });

    useEffect(() => {
        loadHistoryData(id);
    }, [id]);

    return (
        <DecryptionTextWrapper
            encryptedText={data.value?.note ?? ""}
            isEncrypted={data.value?.is_encrypted ?? false}
            onDecrypt={(text) => {
                if (data.value) {
                    data.value = {
                        ...data.value,
                        note: text,
                    };
                }
            }}
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
                        {diffLines.map((line, index) => {
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
        </DecryptionTextWrapper>
    );
}
