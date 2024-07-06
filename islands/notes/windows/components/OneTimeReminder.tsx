import Input from "$components/Input.tsx";
import { dateToYmd } from "$frontend/time.ts";
import { useSignal } from "@preact/signals";

interface OnceReminder {
    date: string;
    time: string;
}

interface OneTimeReminderProps {
    value: OnceReminder;
    onInput: (value: OnceReminder) => void;
}

const validateDateTime = (date: string, time: string) => {
    const errors = [];

    if (date.length === 0 || time.length === 0) {
        errors.push("Please enter reminder date.");
        return errors;
    }

    if (
        new Date().getTime() -
                new Date(date + " " + time).getTime() >
            0
    ) {
        errors.push("Reminder date is in the past.");
    }

    return errors;
};

export function OneTimeReminder({
    value,
    onInput,
}: OneTimeReminderProps) {
    const date = useSignal<string>(value.date);
    const time = useSignal<string>(value.time);
    const errors = useSignal<string[]>(
        validateDateTime(value.date, value.time),
    );

    const handleInput = <T extends keyof OnceReminder>(
        key: T,
        newValue: OnceReminder[T],
    ) => {
        const valueToSend: OnceReminder = {
            date: date.value,
            time: time.value,
            [key]: newValue,
        };

        date.value = valueToSend.date;
        time.value = valueToSend.time;

        errors.value = validateDateTime(
            valueToSend.date,
            valueToSend.time,
        );

        onInput(
            errors.value.length === 0 ? valueToSend : {
                date: "",
                time: "",
            },
        );
    };

    return (
        <>
            <p>Remind me at:</p>
            <Input
                type="date"
                label="Date"
                value={date.value}
                min={dateToYmd(new Date())}
                onInput={(v) => handleInput("date", v)}
            />
            <Input
                type="time"
                label="Time"
                value={time.value}
                onInput={(v) => handleInput("time", v)}
            />
            {errors.value.length > 0 && (
                <div class="text-sm text-red-400">
                    {errors.value.map((e) => <div>{e}</div>)}
                </div>
            )}
        </>
    );
}
