import type { ValidationIssue } from "@/composables/useValidation";
import { isSystemError } from "@/lib/socket/service";

export const getDisplayMessage = (errors: Pick<ValidationIssue, "message">[]) =>
    errors.map((error) => error.message).join(". ");

// Server validation errors carry the issue list as a JSON string in the
// message, like zod's own error message (decision 0.8).
export const parseValidationIssues = (
    message: string,
): ValidationIssue[] | null => {
    if (!message.startsWith("[")) {
        return null;
    }
    try {
        const issues: unknown = JSON.parse(message);
        return Array.isArray(issues) &&
            issues.every(
                (issue) =>
                    typeof issue?.message === "string" &&
                    Array.isArray(issue?.path),
            )
            ? (issues as ValidationIssue[])
            : null;
    } catch {
        return null;
    }
};

export const socketErrorMessage = (error: unknown): string => {
    const message = isSystemError(error)
        ? error.data.message
        : ((error as { error?: unknown })?.error ?? error);

    if (typeof message !== "string") {
        return "Error while processing the request";
    }

    const issues = parseValidationIssues(message);
    return issues ? getDisplayMessage(issues) : message;
};
