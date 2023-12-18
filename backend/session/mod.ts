export interface SessionState<T> {
  data: T;
  getId(): string;
  patch(state: Partial<T>): void;
  set(state: T): void;
}

export * from "./cookie.ts";
export * from "./session.ts";
