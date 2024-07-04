import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Button from "$components/Button.tsx";
import Dialog from "$islands/Dialog.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import {
    dateToHms,
    dateToUnix,
    dateToYmd,
    unixToDate,
} from "$frontend/time.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteReminderDataMessage,
    GetNoteReminderDataResponse,
    RemoveReminderMessage,
    RemoveReminderResponse,
    SetReminderMessage,
    SetReminderResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useEffect } from "preact/hooks";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import Picker from "$components/Picker.tsx";
import ButtonGroup from "$components/ButtonGroup.tsx";
import DropdownList from "$components/DropdownList.tsx";
import { addMessage } from "$frontend/toast-message.ts";

const unitList = [
    { "label": "minute(s)", "value": 60 },
    { "label": "hour(s)", "value": 3600 },
    { "label": "day(s)", "value": 86400 },
    { "label": "week(s)", "value": 604800 },
    { "label": "month(s)", "value": 2592000 },
    { "label": "year(s)", "value": 31536000 },
];
export default function NoteReminder({
    noteId,
    onClose,
}: NoteWindowComponentProps) {
    const shouldAddReminder = useSignal(false);
    const reminderLoader = useLoader();
    const remindMeDate = useSignal("");
    const remindMeTime = useSignal("");
    const interval = useSignal(1);
    const unit = useSignal<number>(60);
    const repeat = useSignal(1);

    const {
        items,
        selectItem,
        selected,
    } = useListState({
        once: "One Time",
        repeat: "Repeat",
    }, "once");

    const { sendMessage } = useWebsocketService();

    const resetValues = () => {
        remindMeDate.value = dateToYmd(new Date());
        remindMeTime.value = dateToHms(new Date());
        interval.value = 1;
        unit.value = 60;
        repeat.value = 1;
        shouldAddReminder.value = false;
    };

    const loadReminderData = reminderLoader.wrap(async () => {
        const response = await sendMessage<
            GetNoteReminderDataMessage,
            GetNoteReminderDataResponse
        >("notes", "getNoteReminderData", {
            data: {
                note_id: noteId,
            },
            expect: "getNoteReminderDataResponse",
        });

        resetValues();

        if (!response.data) {
            return;
        }

        shouldAddReminder.value = true;
        selectItem(response.data.interval ? "repeat" : "once");

        const unixDate = unixToDate(response.data.next_at);

        if (selected.value === "once") {
            remindMeDate.value = dateToYmd(unixDate);
            remindMeTime.value = dateToHms(unixDate);
            return;
        }

        unit.value = response.data.unit_value!;
        interval.value = response.data.interval!;
        repeat.value = response.data.repeat_count;
    });

    const handleSaveReminder = async () => {
        let reminder: SetReminderMessage["reminder"];

        if (!shouldAddReminder.value) {
            await sendMessage<RemoveReminderMessage, RemoveReminderResponse>(
                "notes",
                "removeReminder",
                {
                    data: {
                        note_id: noteId,
                    },
                    expect: "removeReminderResponse",
                },
            );

            addMessage({
                type: "success",
                text: "Reminder removed successfully.",
            });
            onClose();
            return;
        }

        if (selected.value === "once") {
            reminder = {
                type: "once",
                next_at: dateToUnix(
                    new Date(remindMeDate.value + " " + remindMeTime.value),
                ),
            };
        } else {
            reminder = {
                type: "repeat",
                interval: interval.value,
                unit_value: unit.value,
                repeat_count: repeat.value,
            };
        }

        await sendMessage<SetReminderMessage, SetReminderResponse>(
            "notes",
            "setReminder",
            {
                data: {
                    note_id: noteId,
                    reminder,
                },
                expect: "setReminderResponse",
            },
        );

        addMessage({
            type: "success",
            text: "Reminder set successfully.",
        });
        onClose();
    };

    useEffect(() => {
        loadReminderData();
    }, []);

    return (
        <Dialog
            canCancel={true}
            onCancel={onClose}
        >
            <h1 class="text-2xl pb-4">Set Reminder</h1>

            {reminderLoader.running ? <Loader color="white" /> : (
                <div>
                    <div class="mb-4">
                        <Checkbox
                            label="Remind me about this note"
                            checked={shouldAddReminder.value}
                            onChange={(value) =>
                                shouldAddReminder.value = value}
                        />
                    </div>
                    {shouldAddReminder.value && (
                        <>
                            <div class="mb-2">
                                <ButtonGroup
                                    activeItem={selected.value}
                                    items={items}
                                    onSelect={selectItem}
                                />
                            </div>
                            <div class="mb-2">
                                <Picker<keyof typeof items>
                                    selector={selected.value}
                                    map={{
                                        repeat: () => (
                                            <>
                                                <p>
                                                    Starting from now, remind me
                                                    every:
                                                </p>
                                                <div class="flex">
                                                    <div class="w-1/6">
                                                        <Input
                                                            type="number"
                                                            label="Interval"
                                                            value={interval
                                                                .value
                                                                .toString()}
                                                            onInput={(value) =>
                                                                interval
                                                                    .value =
                                                                        parseFloat(
                                                                            value,
                                                                        )}
                                                        />
                                                    </div>
                                                    <div class="w-1/5 pl-2">
                                                        <DropdownList
                                                            label="Unit"
                                                            items={unitList}
                                                            value={unit.value}
                                                        />
                                                    </div>
                                                    <div class="w-1/6 pl-2">
                                                        <Input
                                                            type="number"
                                                            label="Repeat"
                                                            value={repeat
                                                                .value
                                                                .toString()}
                                                            onInput={(value) =>
                                                                repeat
                                                                    .value =
                                                                        parseFloat(
                                                                            value,
                                                                        )}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        ),
                                        once: () => (
                                            <>
                                                <p>Remind me at:</p>
                                                <Input
                                                    type="date"
                                                    label="Date"
                                                    value={remindMeDate.value}
                                                    min={dateToYmd(new Date())}
                                                    onInput={(value) =>
                                                        remindMeDate.value =
                                                            value}
                                                />
                                                <Input
                                                    type="time"
                                                    label="Time"
                                                    value={remindMeTime.value}
                                                    onInput={(value) =>
                                                        remindMeTime.value =
                                                            value}
                                                />
                                                {(remindMeDate.value.length ===
                                                        0 ||
                                                    remindMeTime.value.length ==
                                                        0) && (
                                                    <div class="text-sm text-red-400">
                                                        Please enter reminder
                                                        date.
                                                    </div>
                                                )}
                                            </>
                                        ),
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            <div class="flex justify-end">
                <Button
                    onClick={handleSaveReminder}
                    color="primary"
                >
                    Save
                </Button>
                <Button
                    onClick={onClose}
                    color="danger"
                    addClass="ml-2"
                >
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
