import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Button from "$components/Button.tsx";
import Dialog from "$islands/Dialog.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import { useSignal } from "@preact/signals";
import { dateToUnix } from "$frontend/time.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
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
import { addMessage } from "$frontend/toast-message.ts";
import { OneTimeReminder } from "$islands/notes/windows/components/OneTimeReminder.tsx";
import { RepeatReminder } from "$islands/notes/windows/components/RepeatReminder.tsx";
import PresetReminder from "$islands/notes/windows/components/PresetReminder.tsx";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { getCurrentUnixTimestamp } from "$backend/time.ts";
import { validateSchema } from "$schemas/mod.ts";
import { setReminderSchema } from "$schemas/notes.ts";

type ReminderType = "once" | "repeat";

export default function NoteReminder({
    noteId,
    onClose,
}: NoteWindowComponentProps) {
    const shouldAddReminder = useSignal(false);
    const reminderLoader = useLoader();
    const reminderType = useSignal<ReminderType>("once");
    const remindMeDate = useSignal("");
    const remindMeTime = useSignal("");
    const interval = useSignal(1);
    const unit = useSignal<number>(60);
    const repeat = useSignal(1);

    const timeFormatter = useTimeFormat();

    const {
        items,
        selectItem,
        selected,
    } = useListState(
        {
            preset: "Preset",
            once: "One Time",
            repeat: "Repeat",
        },
        "preset",
        (key) => {
            reminderType.value = key === "preset"
                ? "once"
                : key as ReminderType;
        },
    );

    const { sendMessage } = useWebsocketService();

    const resetValues = () => {
        remindMeDate.value = timeFormatter.formatIsoDate(new Date());
        remindMeTime.value = timeFormatter.formatIsoTime(
            getCurrentUnixTimestamp() + 3600,
        );
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

        if (response.data.interval === null) {
            remindMeDate.value = timeFormatter.formatIsoDate(
                response.data.next_at,
            );
            remindMeTime.value = timeFormatter.formatIsoTime(
                response.data.next_at,
            );
            return;
        }

        unit.value = response.data.unit_value!;
        interval.value = response.data.interval!;
        repeat.value = response.data.repeat_count;
    });

    const handleSaveReminder = async () => {
        let reminder: SetReminderMessage["reminder"];
        try {
            if (!shouldAddReminder.value) {
                await sendMessage<
                    RemoveReminderMessage,
                    RemoveReminderResponse
                >(
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
                    type: "warning",
                    text: "Reminder removed successfully.",
                });
                onClose();
                return;
            }

            if (reminderType.value === "once") {
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

            const data = {
                note_id: noteId,
                reminder,
            };

            if (await validateSchema(setReminderSchema, data) !== null) {
                return;
            }

            await sendMessage<SetReminderMessage, SetReminderResponse>(
                "notes",
                "setReminder",
                {
                    data,
                    expect: "setReminderResponse",
                },
            );

            addMessage({
                type: "success",
                text: "Reminder set successfully.",
            });
        } catch (e) {
            const responseError = e as SystemErrorMessage;
            addMessage({
                type: "error",
                text: "Failed to set reminder. Reason: " +
                    responseError.data.message,
            });
        } finally {
            onClose();
        }
    };

    const handlePresetSelected = (nextAt: number) => {
        remindMeDate.value = timeFormatter.formatIsoDate(nextAt);
        remindMeTime.value = timeFormatter.formatIsoTime(nextAt);
        handleSaveReminder();
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
                                        preset: () => (
                                            <PresetReminder
                                                onPresetSelected={handlePresetSelected}
                                            />
                                        ),
                                        repeat: () => (
                                            <RepeatReminder
                                                value={{
                                                    interval: interval.value,
                                                    unit: unit.value,
                                                    repeat: repeat.value,
                                                }}
                                                onInput={(v) => {
                                                    interval.value = v.interval;
                                                    unit.value = v.unit;
                                                    repeat.value = v.repeat;
                                                }}
                                            />
                                        ),
                                        once: () => (
                                            <OneTimeReminder
                                                value={{
                                                    date: remindMeDate.value,
                                                    time: remindMeTime.value,
                                                }}
                                                onInput={(v) => {
                                                    remindMeDate.value = v.date;
                                                    remindMeTime.value = v.time;
                                                }}
                                            />
                                        ),
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            <div class="flex justify-end">
                {selected.value !== "preset" && (
                    <Button
                        onClick={handleSaveReminder}
                        color="primary"
                    >
                        Save
                    </Button>
                )}
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
