import type { PublicSharedNote } from "@/types/records";

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export const apiErrorMessage = (error: unknown) =>
    error instanceof ApiError
        ? error.message
        : "Could not reach the server. Please try again.";

export interface ApiRequestOptions {
    signal?: AbortSignal;
}

const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
    options: ApiRequestOptions = {},
): Promise<T> => {
    const headers: Record<string, string> = {
        Accept: "application/json",
    };
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, {
        method,
        headers,
        credentials: "same-origin",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: options.signal,
    });

    if (!response.ok) {
        let message = response.statusText;
        try {
            const data = (await response.json()) as { error?: string };
            message = data.error ?? message;
        } catch {
            // Non JSON error body.
        }
        throw new ApiError(response.status, message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
};

export interface ProcessStepRequest {
    step: string;
    action: string;
    data: unknown;
}

const getPublicNote = (identifier: string) =>
    request<PublicSharedNote>(
        "GET",
        `/api/public/${encodeURIComponent(identifier)}`,
    );

export const api = {
    get: <T>(path: string, options?: ApiRequestOptions) =>
        request<T>("GET", path, undefined, options),
    post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
        request<T>("POST", path, body, options),
    processStep: <T>(body: ProcessStepRequest, options?: ApiRequestOptions) =>
        request<T>("POST", "/api/process-step", body, options),
    getPublicNote,
};
