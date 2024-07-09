import Button from "$components/Button.tsx";
import { dateToUnix, getCurrentUnixTimestamp } from "$lib/time/unix.ts";

type PresetMap = {
    [key: string]: {
        title: string;
        getNextAtFromNow: () => number;
    };
};

const presets: PresetMap = {
    in1Hour: {
        title: "1 hour from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 3600,
    },
    in3Hours: {
        title: "3 hours from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 10800,
    },
    in1Day: {
        title: "1 day from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 86400,
    },
    in3Days: {
        title: "3 days from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 259200,
    },
    in1Week: {
        title: "1 week from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 604800,
    },
    in1Month: {
        title: "1 month from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 2592000,
    },
    nextMonday: {
        title: "Next monday",
        getNextAtFromNow: () => {
            const now = new Date();
            const daysUntilNextMonday = (1 + 7 - now.getDay()) % 7;
            return dateToUnix(
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() + daysUntilNextMonday,
                ),
            );
        },
    },
    nextWednesday: {
        title: "Next wednesday",
        getNextAtFromNow: () => {
            const now = new Date();
            const daysUntilNextWednesday = (3 + 7 - now.getDay()) % 7;
            return dateToUnix(
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() + daysUntilNextWednesday,
                ),
            );
        },
    },
    nextFriday: {
        title: "Next friday",
        getNextAtFromNow: () => {
            const now = new Date();
            const daysUntilNextFriday = (5 + 7 - now.getDay()) % 7;
            return dateToUnix(
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() + daysUntilNextFriday,
                ),
            );
        },
    },
    endOfThisMonth: {
        title: "End of this month",
        getNextAtFromNow: () => {
            const now = new Date();

            return dateToUnix(
                new Date(now.getFullYear(), now.getMonth() + 1, 0),
            );
        },
    },
    startOfNextMonth: {
        title: "Start of next month",
        getNextAtFromNow: () => {
            const now = new Date();
            return dateToUnix(
                new Date(now.getFullYear(), now.getMonth() + 1, 1),
            );
        },
    },
} as const;

interface PresetReminderProps {
    onPresetSelected: (nextAt: number) => void;
}

export default function PresetReminder({
    onPresetSelected,
}: PresetReminderProps) {
    return (
        <div class="grid grid-cols-3 gap-2">
            {Object.entries(presets).map((
                [key, { title, getNextAtFromNow }],
            ) => (
                <Button
                    key={key}
                    color="success"
                    onClick={() => onPresetSelected(getNextAtFromNow())}
                >
                    {title}
                </Button>
            ))}
        </div>
    );
}
