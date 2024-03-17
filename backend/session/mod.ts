export interface SessionState<T> {
    data: T;
    getId(): string;
    getUserId(): number;
    patch(state: Partial<T>): Promise<void>;
    set(state: T): Promise<void>;
}

export * from "./cookie.ts";
export * from "./session.ts";
