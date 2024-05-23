import { ZodIssue } from "$schemas/deps.ts";

interface ErrorDisplayProps<T> {
    path: string;
    errors: ZodIssue[] | null;
}

export default function ErrorDisplay<T>(
    {
        path,
        errors,
    }: ErrorDisplayProps<T>,
) {
    return errors
        ? (
            <div class="text-red-600">
                {errors.filter((e) => e.path.includes(path)).map((error) => (
                    <div>
                        {error.message}
                    </div>
                ))}
            </div>
        )
        : null;
}
