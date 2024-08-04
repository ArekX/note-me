import { ValidationState } from "$frontend/hooks/use-validation.ts";

interface ErrorDisplayProps {
    path: string;
    state: ValidationState;
}

export default function ErrorDisplay(
    {
        path,
        state,
    }: ErrorDisplayProps,
) {
    return !state.valid.value
        ? (
            <div class="text-red-600">
                {state.errors.value.filter((e) => e.path.join(".") === path)
                    .map((
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
