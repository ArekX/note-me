import type { Message, MessagePayload } from "@/types/messages";
import type { MockState } from "./state";
import { roleDefinitions, type AppPermission } from "@/lib/rbac";

export interface MockContext {
    state: MockState;
    respond: <R extends Message>(
        type: R["type"],
        data?: MessagePayload<R>,
    ) => void;
    push: <R extends Message>(
        namespace: R["namespace"],
        type: R["type"],
        data?: MessagePayload<R>,
    ) => void;
    fail: (message: string) => void;
}

export type MockHandler<T extends Message = Message> = (
    message: T & { binaryData?: Uint8Array },
    ctx: MockContext,
) => void | Promise<void>;

export type MockHandlerMap<T extends Message> = {
    [K in T["type"]]: MockHandler<Extract<T, { type: K }>>;
};

export const nextId = (state: MockState): number => state.nextId++;

// Returns the server's error text when the mock user's role lacks it.
export const missingPermission = (
    state: MockState,
    permission: AppPermission,
): string | null => {
    const role = state.currentUser.role as keyof typeof roleDefinitions;
    return (
        roleDefinitions[role]?.permissions as readonly AppPermission[]
    )?.includes(permission)
        ? null
        : `User does not have the required permission: ${permission}`;
};

export const paged = <T>(items: T[], page = 1, perPage = 20) => ({
    results: items.slice((page - 1) * perPage, page * perPage),
    total: items.length,
    page,
    per_page: perPage,
});

export const contains = (haystack: string, needle?: string): boolean =>
    !needle || haystack.toLowerCase().includes(needle.toLowerCase());
