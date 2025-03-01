import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import Loader from "$islands/Loader.tsx";
import { useEffect } from "preact/hooks";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";
import {
    DeleteSingleMessage,
    NotificationFrontendResponse,
    NotificationListResponse,
} from "$workers/websocket/api/notifications/messages.ts";
import { NotificationDataTypes } from "$db";
import { GetMyNotificationsMessage } from "$workers/websocket/api/notifications/messages.ts";
import ReminderItem from "$islands/sidebar/reminders/ReminderItem.tsx";

type ReminderNotification =
    & Extract<
        NotificationDataTypes,
        { type: "reminder-received" }
    >["payload"]
    & {
        notification_id: number;
        created_at: number;
    };

const sortReminders = (reminders: ReminderNotification[]) => {
    return reminders.sort((a, b) => a.created_at - b.created_at);
};

export default function PassedReminders() {
    const loader = useLoader(true);

    const { sendMessage, dispatchMessage } = useWebsocketService<
        NotificationFrontendResponse
    >({
        eventMap: {
            notifications: {
                notificationAdded: (notification) => {
                    if (notification.record.data.type === "reminder-received") {
                        reminders.value = sortReminders([
                            ...reminders.value,
                            {
                                notification_id: notification.record.id,
                                ...notification.record.data.payload,
                                created_at: notification.record.created_at,
                            },
                        ]);
                    }
                },
                deletedAll: () => {
                    reminders.value = [];
                },
                deletedSingle: (data) => {
                    reminders.value = reminders.value.filter(
                        (r) => r.notification_id !== data.id,
                    );
                },
            },
        },
    });

    const reminders = useSignal<ReminderNotification[]>([]);

    const fetchNotifications = loader.wrap(async () => {
        const response = await sendMessage<
            GetMyNotificationsMessage,
            NotificationListResponse
        >("notifications", "getMyNotifications", {
            expect: "notificationsList",
        });

        reminders.value = sortReminders(
            response.records.filter((n) => n.data.type === "reminder-received")
                .map((n) => {
                    return {
                        ...n.data.payload,
                        notification_id: n.id,
                        created_at: n.created_at,
                    } as ReminderNotification;
                }),
        );
    });

    const deleteReminderNotification = (
        reminder: ReminderNotification,
    ) => {
        dispatchMessage<DeleteSingleMessage>(
            "notifications",
            "deleteSingle",
            {
                id: reminder.notification_id,
            },
        );
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    return (
        <div>
            <strong class="text-lg py-2 flex justify-between">
                <span>Passed reminders{" "}</span>
                {!loader.running && (
                    <span>
                        <Button
                            color="success"
                            onClick={fetchNotifications}
                            size="sm"
                        >
                            <Icon name="refresh" size="sm" />
                        </Button>
                    </span>
                )}
            </strong>
            <div>
                {loader.running ? <Loader color="white" /> : (
                    <>
                        {reminders.value.length === 0 && (
                            <div class=" text-gray-400">
                                No passed reminders.
                            </div>
                        )}
                        {reminders.value.map((record) => (
                            <ReminderItem
                                addClass="rounded-lg"
                                key={record.id}
                                hideReminderButton
                                buttons={
                                    <>
                                        <Button
                                            color="success"
                                            title="Mark as done and remove"
                                            onClick={(e) => {
                                                deleteReminderNotification(
                                                    record,
                                                );
                                                e.stopPropagation();
                                            }}
                                        >
                                            <Icon name="check" size="sm" />
                                        </Button>
                                    </>
                                }
                                record={{
                                    id: record.id,
                                    title: record.title,
                                    note_id: record.id,
                                    is_encrypted: record.is_encrypted,
                                    author_id: record.user_id,
                                    author_name: record.user_name,
                                    type: "once",
                                    done_count: 1,
                                    repeat_count: 0,
                                    next_at: record.created_at,
                                }}
                            />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
