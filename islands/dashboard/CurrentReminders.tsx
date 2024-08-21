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
import { NotificationFrontendResponse } from "$workers/websocket/api/notifications/messages.ts";

export default function CurrentReminders() {
    const loader = useLoader(true);

    const { sendMessage } = useWebsocketService<
        NoteFrontendResponse | NotificationFrontendResponse
    >({
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
            notifications: {
                notificationAdded: (notification) => {
                    if (notification.record.data.type === "reminder-received") {
                        const payload = notification.record.data.payload;
                        results.value = results.value.filter((v) =>
                            v.id !== payload.reminder_id
                        );
                    }
                },
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
                <span>Current reminders{" "}</span>
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
                            <div class=" text-gray-400">
                                No reminders set.
                            </div>
                        )}
                        {results.value.map((note) => (
                            <ReminderItem
                                addClass="rounded-lg"
                                key={note.id}
                                record={note}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
