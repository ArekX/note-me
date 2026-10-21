import { computed, ref } from "vue";
import { parseValidationIssues } from "@/lib/error-messages";
import { isSystemError } from "@/lib/socket/service";
import { validateSchema, type zod } from "@/schemas";

export type ValidationIssue = Pick<
    zod.core.$ZodIssue,
    "code" | "path" | "message"
>;

export interface ValidationState {
    errors: Readonly<{ value: ValidationIssue[] }>;
    isValid: Readonly<{ value: boolean }>;
}

export const useValidation = <T>(schema: zod.ZodType) => {
    const errors = ref<ValidationIssue[]>([]);
    const isValid = computed(() => errors.value.length === 0);

    const validate = async (data: T): Promise<boolean> => {
        errors.value = (await validateSchema(schema, data)) ?? [];
        return errors.value.length === 0;
    };

    const setErrors = (issues: ValidationIssue[]) => {
        errors.value = issues;
    };

    // False when the error is not a server validation error.
    const setServerErrors = (error: unknown): boolean => {
        const issues = isSystemError(error)
            ? parseValidationIssues(error.data.message)
            : null;
        if (issues) {
            errors.value = issues;
        }
        return issues !== null;
    };

    const reset = () => {
        errors.value = [];
    };

    const state: ValidationState = { errors, isValid };

    return {
        state,
        errors,
        isValid,
        validate,
        setErrors,
        setServerErrors,
        reset,
    };
};
