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

interface HistoryDiffProps {
    id: number;
}

export default function HistoryDiff({
    id,
}: HistoryDiffProps) {
    const { sendMessage } = useWebsocketService();
    const loader = useLoader();
    const data = useSignal<NoteHistoryDataRecord | null>(null);

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
            {loader.running ? <Loader color="white" /> : (
                <div>
                    Data
                </div>
            )}
        </div>
    );
}
