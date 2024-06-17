import {
    ReadonlySignal,
    Signal,
    useComputed,
    useSignal,
} from "@preact/signals";
import { zod, ZodIssue } from "$schemas/deps.ts";
import { validateSchema } from "$schemas/mod.ts";

interface ValidationOptions {
    schema: zod.ZodTypeAny | (() => zod.ZodTypeAny);
}

type ValidationHook<T> = [
    ValidationState,
    (data: T) => Promise<boolean>,
];

export interface ValidationState {
    errors: Signal<ZodIssue[]>;
    valid: ReadonlySignal<boolean>;
    reset: () => void;
}

export const useValidation = <T>({
    schema,
}: ValidationOptions): ValidationHook<T> => {
    const errors = useSignal<ZodIssue[]>([]);
    const valid = useComputed(() => errors.value.length === 0);

    const validate = async (data: T) => {
        let schemaData: zod.ZodTypeAny;

        if (typeof schema === "function") {
            schemaData = schema();
        } else {
            schemaData = schema;
        }

        errors.value = await validateSchema(schemaData, data) ?? [];

        return errors.value.length === 0;
    };

    const reset = () => {
        errors.value = [];
    };

    return [
        { errors, valid, reset },
        validate,
    ];
};
