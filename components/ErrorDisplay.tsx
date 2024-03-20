import { zod } from "$schemas/deps.ts";

interface ErrorDisplayProps<T> {
    label?: string;
    errors: zod.ZodFormattedError<T> | null | undefined;
}

export function ErrorDisplay<T>(
    props: ErrorDisplayProps<T>,
) {
    return props.errors
        ? (
            <div class="text-red-600">
                {props.label && <strong>{props.label}{": "}</strong>}
                {props.errors?._errors.join(", ")}
            </div>
        )
        : null;
}
