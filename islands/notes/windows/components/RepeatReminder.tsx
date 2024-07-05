import Input from "$components/Input.tsx";
import DropdownList from "$components/DropdownList.tsx";

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

export function RepeatReminder({
    value,
    onInput,
}: OneTimeReminderProps) {
    const handleInput = <T extends keyof RepeatValue>(
        key: T,
        newValue: RepeatValue[T],
    ) => {
        onInput({ ...value, [key]: newValue });
    };
    return (
        <>
            <p>
                Starting from now, remind me every:
            </p>
            <div class="flex">
                <div class="w-1/6">
                    <Input
                        type="number"
                        label="Interval"
                        value={value.interval.toString()}
                        onInput={(v) => handleInput("interval", parseFloat(v))}
                    />
                </div>
                <div class="w-1/5 pl-2">
                    <DropdownList<number>
                        label="Unit"
                        items={unitList}
                        value={value.unit}
                        onInput={(v) => handleInput("unit", v)}
                    />
                </div>
                <div class="w-1/6 pl-2">
                    <Input
                        type="number"
                        label="Repeat"
                        value={value.repeat.toString()}
                        onInput={(v) => handleInput("repeat", parseFloat(v))}
                    />
                </div>
            </div>
        </>
    );
}
