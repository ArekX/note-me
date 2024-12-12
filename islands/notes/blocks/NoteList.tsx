import { TreeRecord } from "../../../workers/database/query/tree-list.repository.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useEffect } from "preact/hooks";
import {
    GetTreeMessage,
    GetTreeResponse,
} from "$workers/websocket/api/tree/messages.ts";
import Loader from "$islands/Loader.tsx";
import { redirectTo } from "$frontend/redirection-manager.ts";

interface NoteListProps {
    groupId: number;
    allowLinks?: boolean;
}

export default function NoteList({
    groupId,
    allowLinks = true,
}: NoteListProps) {
    const { sendMessage } = useWebsocketService();

    const notes = useSignal<TreeRecord[]>([]);

    const noteListLoader = useLoader(true);

    const loadNotes = noteListLoader.wrap(async () => {
        const response = await sendMessage<GetTreeMessage, GetTreeResponse>(
            "tree",
            "getTree",
            {
                data: {
                    parent_id: groupId !== 0 ? groupId : undefined,
                    item_type: "note",
                },
                expect: "getTreeResponse",
            },
        );

        notes.value = response.records;
    });

    const openNote = (e: Event, noteId: number) => {
        e.preventDefault();
        e.stopPropagation();

        if (!allowLinks) {
            return;
        }

        redirectTo.viewNote({ noteId });
    };

    useEffect(() => {
        loadNotes();
    }, [groupId]);

    return (
        <div>
            {noteListLoader.running ? <Loader color="white" /> : (
                <>
                    {notes.value.length === 0 && (
                        <div class="text-gray-400">
                            No notes found in this group.
                        </div>
                    )}
                    <ul class="list-disc ml-4">
                        {notes.value.map((record) => (
                            <li key={record.id}>
                                <a
                                    class="cursor-pointer text-gray-400 hover:underline"
                                    href={allowLinks
                                        ? `/app/note/view-${record.id}`
                                        : "#"}
                                    target={allowLinks ? "_blank" : undefined}
                                    onClick={(e) => openNote(e, record.id)}
                                >
                                    {record.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
