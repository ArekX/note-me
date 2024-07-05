import Input from "$components/Input.tsx";
import { dateToYmd } from "$frontend/time.ts";

interface OnceReminder {
    date: string;
    time: string;
}

interface OneTimeReminderProps {
    value: OnceReminder;
    onInput: (value: OnceReminder) => void;
}

export function OneTimeReminder({
    value,
    onInput,
}: OneTimeReminderProps) {
    const handleInput = <T extends keyof OnceReminder>(
        key: T,
        newValue: OnceReminder[T],
    ) => {
        onInput({ ...value, [key]: newValue });
    };

    const isDateTimeCorrect = value.date.length > 0 && value.time.length > 0;
    return (
        <>
            <p>Remind me at:</p>
            <Input
                type="date"
                label="Date"
                value={value.date}
                min={dateToYmd(new Date())}
                onInput={(v) => handleInput("date", v)}
            />
            <Input
                type="time"
                label="Time"
                value={value.time}
                onInput={(v) => handleInput("time", v)}
            />
            {isDateTimeCorrect && (
                <div class="text-sm text-red-400">
                    Please enter reminder date.
                </div>
            )}
        </>
    );
}
