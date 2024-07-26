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
import { getFormattedTagString } from "$frontend/tags.ts";
import TextDiff from "$islands/TextDiff.tsx";
import LockedContentWrapper from "$islands/encryption/LockedContentWrapper.tsx";

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
    const historyRecord = useSignal<NoteHistoryDataRecord | null>(null);

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

        historyRecord.value = response.data;
    });

    useEffect(() => {
        loadHistoryData(id);
    }, [id]);

    if (loader.running) {
        return <Loader color="white" />;
    }

    if (!historyRecord.value) {
        return <div>No history data found</div>;
    }

    return (
        <LockedContentWrapper
            inputRecords={[historyRecord.value]}
            protectedKeys={["note"]}
            isLockedKey={"is_encrypted"}
            unlockRender={([record]) => {
                return (
                    <div class="p-4">
                        <h2 class="text-xl">{record.title}</h2>
                        <h4 class="text-lg">
                            {getFormattedTagString(
                                record.tags.replace(/,/g, " "),
                            )}
                        </h4>
                        {showType === "note"
                            ? (
                                <pre class="text-sm whitespace-pre-wrap">{record.note}</pre>
                            )
                            : (
                                <TextDiff
                                    text1={record.note}
                                    text2={noteText}
                                />
                            )}
                    </div>
                );
            }}
        />
    );
}
