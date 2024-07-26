import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";
import { ReminderNoteRecord } from "$backend/repository/note-reminder-repository.ts";
import ReminderItem from "$islands/sidebar/reminders/ReminderItem.tsx";

export default function RemindersEndingSoon() {
    const loader = useLoader(true);

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                updateNoteResponse: (data) => {
                    if (!data.updated_data.title) {
                        return;
                    }

                    const note = results.value.find(
                        (note) => note.note_id === data.updated_id,
                    );

                    if (note) {
                        note.title = data.updated_data.title;
                        results.value = [...results.value];
                    }
                },
                setReminderResponse: () => fetchNotes(),
                removeReminderResponse: () => fetchNotes(),
            },
        },
    });

    const results = useSignal<ReminderNoteRecord[]>([]);

    const fetchNotes = loader.wrap(async () => {
        const response = await sendMessage<
            FindNoteRemindersMessage,
            FindNoteRemindersResponse
        >("notes", "findNoteReminders", {
            data: {
                filters: {
                    limit: 5,
                },
            },
            expect: "findNoteRemindersResponse",
        });

        results.value = response.records;
    });

    useEffect(() => {
        fetchNotes();
    }, []);

    return (
        <div>
            <strong class="text-lg py-2 flex justify-between">
                <span>Reminders Ending Soon{" "}</span>
                {!loader.running && (
                    <span>
                        <Button color="success" onClick={fetchNotes} size="sm">
                            <Icon name="refresh" size="sm" />
                        </Button>
                    </span>
                )}
            </strong>
            <div>
                {loader.running ? <Loader color="white" /> : (
                    <>
                        {results.value.length === 0 && (
                            <div class=" text-gray-500">
                                No reminders set.
                            </div>
                        )}
                        {results.value.map((note) => (
                            <ReminderItem key={note.id} record={note} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
