import Button from "$components/Button.tsx";
import { dateToUnix, getCurrentUnixTimestamp } from "$lib/time/unix.ts";

type PresetMap = {
    [key: string]: {
        title: string;
        getNextAtFromNow: () => number;
    };
};

const presets: PresetMap = {
    in5Minutes: {
        title: "In 5 minutes",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 300,
    },
    in30Minutes: {
        title: "In 30 minutes",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 1800,
    },
    in1Hour: {
        title: "In 1 hour",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 3600,
    },
    in3Hours: {
        title: "In 3 hours",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 10800,
    },
    in1Day: {
        title: "Tomorrow",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 86400,
    },
    in3Days: {
        title: "3 days from now",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 259200,
    },
    in1Week: {
        title: "In a week",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 604800,
    },
    in1Month: {
        title: "In a month",
        getNextAtFromNow: () => getCurrentUnixTimestamp() + 2592000,
    },
    nextMonday: {
        title: "Next monday",
        getNextAtFromNow: () => {
            const now = new Date();
            const daysUntilNextMonday = (1 + 7 - now.getDay()) % 7 || 7;
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
            const daysUntilNextWednesday = (3 + 7 - now.getDay()) % 7 || 7;
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
            const daysUntilNextFriday = (5 + 7 - now.getDay()) % 7 || 7;
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

export default function QuickPickReminder({
    onPresetSelected,
}: PresetReminderProps) {
    return (
        <>
            <div class="py-2">
                When should we remind you?
            </div>
            <div class="grid lg:grid-cols-3 lg:gap-2 md:grid-cols-2 md:gap-1 max-md:grid-cols-1">
                {Object.entries(presets).map((
                    [key, { title, getNextAtFromNow }],
                ) => (
                    <Button
                        key={key}
                        color="success"
                        addClass="max-md:mb-2"
                        onClick={() => onPresetSelected(getNextAtFromNow())}
                    >
                        {title}
                    </Button>
                ))}
            </div>
        </>
    );
}
