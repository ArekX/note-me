import { useSignal } from "@preact/signals";
import { NoteHistoryDataRecord } from "$backend/repository/note-history-repository.ts";
import { useLoader } from "$frontend/hooks/use-loading.ts";
import {
    GetNoteHistoryDataMessage,
    GetNoteHistoryDataResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import { diffText } from "$frontend/diff.ts";

interface HistoryDiffProps {
    id: number;
    noteText: string;
}

export default function HistoryDiff({
    id,
    noteText,
}: HistoryDiffProps) {
    const { sendMessage } = useWebsocketService();
    const loader = useLoader(true);
    const data = useSignal<NoteHistoryDataRecord | null>(null);

    const diffLines = data.value ? diffText(noteText, data.value.note) : [];

    const loadHistoryData = async (id: number) => {
        loader.start();
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
        loader.stop();
    };

    useEffect(() => {
        loadHistoryData(id);
    }, [id]);

    return (
        <div>
            {loader.running
                ? <Loader color="white" />
                : (
                    <div class="diff-viewer text-sm">
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
                    </div>
                )}
        </div>
    );
}
