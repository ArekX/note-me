import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Button from "$components/Button.tsx";
import Dialog from "$islands/Dialog.tsx";
import Checkbox from "$islands/Checkbox.tsx";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import { getDateWithAddedDays } from "$frontend/time.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";

type ReminderType = "once" | "repeat";

export default function NoteReminder({
    onClose,
}: NoteWindowComponentProps) {
    const shouldAddReminder = useSignal(false);
    const reminderLoader = useLoader();
    const _reminderType = useSignal<ReminderType>("once");
    const nextAt = useSignal("");
    const _intervalSeconds = useSignal(0);
    const _repeatCount = useSignal(0);

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
                        <div class="mb-2">
                            <Input
                                type="date"
                                value={nextAt.value}
                                min={getDateWithAddedDays(1).toISOString()
                                    .split(
                                        "T",
                                    )[0]}
                                onInput={(value) => nextAt.value = value}
                            />
                            {nextAt.value.length === 0 && (
                                <div class="text-sm text-red-400">
                                    Please enter reminder date.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div class="flex justify-end">
                <Button
                    onClick={() => {}}
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
