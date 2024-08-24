import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Button from "$components/Button.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { dateToUnix, getCurrentUnixTimestamp } from "$lib/time/unix.ts";
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
import QuickPickReminder from "./components/QuickPickReminder.tsx";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { validateSchema } from "$schemas/mod.ts";
import { setReminderSchema } from "$schemas/notes.ts";
import NoItemMessage from "$islands/sidebar/NoItemMessage.tsx";

type ReminderType = "once" | "repeat";

export default function NoteReminder({
    noteId,
    onClose,
}: NoteWindowComponentProps) {
    const isReminderAdded = useSignal(false);
    const isDataLoaded = useSignal(false);
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
            preset: "Quick Pick",
            once: "Remind me once",
            repeat: "Remind me repeatedly",
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
        isReminderAdded.value = false;
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

        isReminderAdded.value = true;
        isDataLoaded.value = true;
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
            if (!isReminderAdded.value) {
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

    const handleRemoveReminder = async () => {
        isReminderAdded.value = false;
        if (isDataLoaded.value) {
            await handleSaveReminder();
        }
    };

    useEffect(() => {
        loadReminderData();
    }, []);

    return (
        <Dialog
            canCancel={true}
            onCancel={onClose}
            title="Note Reminder"
            props={{ "class": "md:w-3/4 lg:w-2/4 max-md:w-full" }}
        >
            {reminderLoader.running ? <Loader color="white" /> : (
                <div>
                    {!isReminderAdded.value
                        ? (
                            <div class="mb-4">
                                <div class="py-5">
                                    <NoItemMessage
                                        icon="alarm"
                                        message="No reminder set."
                                    />
                                </div>
                            </div>
                        )
                        : (
                            <>
                                <div class="mb-2">
                                    <ButtonGroup
                                        activeItem={selected.value}
                                        items={items}
                                        onSelect={selectItem}
                                    />
                                </div>
                                <div class="mb-2 py-5">
                                    <Picker<keyof typeof items>
                                        selector={selected.value}
                                        map={{
                                            preset: () => (
                                                <QuickPickReminder
                                                    onPresetSelected={handlePresetSelected}
                                                />
                                            ),
                                            repeat: () => (
                                                <RepeatReminder
                                                    value={{
                                                        interval:
                                                            interval.value,
                                                        unit: unit.value,
                                                        repeat: repeat.value,
                                                    }}
                                                    onInput={(v) => {
                                                        interval.value =
                                                            v.interval;
                                                        unit.value = v.unit;
                                                        repeat.value = v.repeat;
                                                    }}
                                                />
                                            ),
                                            once: () => (
                                                <OneTimeReminder
                                                    value={{
                                                        date:
                                                            remindMeDate.value,
                                                        time:
                                                            remindMeTime.value,
                                                    }}
                                                    onInput={(v) => {
                                                        remindMeDate.value =
                                                            v.date;
                                                        remindMeTime.value =
                                                            v.time;
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

            <div class="flex justify-end pt-5">
                {selected.value !== "preset" && (
                    <Button
                        onClick={handleSaveReminder}
                        color="success"
                    >
                        Save
                    </Button>
                )}
                {isDataLoaded.value && isReminderAdded.value
                    ? (
                        <Button
                            onClick={handleRemoveReminder}
                            color="danger"
                            addClass="ml-2"
                        >
                            Remove Reminder
                        </Button>
                    )
                    : isReminderAdded.value === false && (
                        <Button
                            color="success"
                            onClick={() => isReminderAdded.value = true}
                        >
                            Set reminder
                        </Button>
                    )}
                <Button
                    onClick={onClose}
                    color="primary"
                    addClass="ml-2"
                >
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
