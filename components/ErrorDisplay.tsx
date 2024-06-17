import { ValidationState } from "$frontend/hooks/use-validation.ts";

interface ErrorDisplayProps<T> {
    path: string;
    state: ValidationState;
}

export default function ErrorDisplay<T>(
    {
        path,
        state,
    }: ErrorDisplayProps<T>,
) {
    return !state.valid.value
        ? (
            <div class="text-red-600">
                {state.errors.value.filter((e) => e.path.includes(path)).map((
                    error,
                ) => (
                    <div>
                        {error.message}
                    </div>
                ))}
            </div>
        )
        : null;
}
