import Input from "$components/Input.tsx";
import DropdownList from "$components/DropdownList.tsx";
import { useSignal } from "@preact/signals";

interface OneTimeReminderProps {
    value: RepeatValue;
    onInput: (value: RepeatValue) => void;
}

const unitList = [
    { "label": "minute(s)", "value": 60 },
    { "label": "hour(s)", "value": 3600 },
    { "label": "day(s)", "value": 86400 },
    { "label": "week(s)", "value": 604800 },
    { "label": "month(s)", "value": 2592000 },
    { "label": "year(s)", "value": 31536000 },
];

interface RepeatValue {
    interval: number;
    unit: number;
    repeat: number;
}

const validateInterval = (interval: number, repeat: number) => {
    const errors: string[] = [];

    if (isNaN(interval)) {
        errors.push("Please enter a valid number for interval.");
    }

    if (isNaN(repeat)) {
        errors.push("Please enter a valid number for repeat.");
    }

    if (interval <= 0) {
        errors.push("Please enter a positive number for interval.");
    }

    if (repeat <= 0) {
        errors.push("Please enter a positive number for repeat.");
    }

    return errors;
};

export function RepeatReminder({
    value,
    onInput,
}: OneTimeReminderProps) {
    const interval = useSignal<number>(value.interval);
    const unit = useSignal<number>(value.unit);
    const repeat = useSignal<number>(value.repeat);
    const errors = useSignal<string[]>(
        validateInterval(value.interval, value.repeat),
    );

    const handleInput = <T extends keyof RepeatValue>(
        key: T,
        newValue: RepeatValue[T],
    ) => {
        const newInterval = {
            interval: interval.value,
            unit: unit.value,
            repeat: repeat.value,
            [key]: newValue,
        };

        interval.value = newInterval.interval;
        unit.value = newInterval.unit;
        repeat.value = newInterval.repeat;

        errors.value = validateInterval(
            newInterval.interval,
            newInterval.repeat,
        );

        onInput(
            errors.value.length === 0 ? newInterval : {
                interval: 0,
                unit: 0,
                repeat: 0,
            },
        );
    };
    return (
        <>
            <p class="py-2">
                How often should we remind you?
            </p>
            <div class="flex flex-wrap">
                <div class="basis-1/6 max-md:basis-1/2">
                    <Input
                        type="number"
                        label="Every"
                        min="1"
                        value={interval.value.toString()}
                        onInput={(v) => handleInput("interval", parseFloat(v))}
                    />
                </div>
                <div class="basis-1/5 pl-2 max-md:basis-1/2">
                    <DropdownList<number>
                        label="Of"
                        items={unitList}
                        value={unit.value}
                        onInput={(v) => handleInput("unit", v)}
                    />
                </div>
                <div class="basis-1/4 md:pl-5 max-md:pt-2 max-md:basis-full">
                    <Input
                        type="number"
                        label="How many times?"
                        min="1"
                        value={repeat.value.toString()}
                        onInput={(v) => handleInput("repeat", parseFloat(v))}
                    />
                </div>
            </div>
            {errors.value.length > 0 && (
                <div class="text-sm text-red-400">
                    {errors.value.map((e) => <div>{e}</div>)}
                </div>
            )}
        </>
    );
}
