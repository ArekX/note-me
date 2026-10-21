import type { SocketService } from "@/lib/socket";
import type { AiToolStatus } from "@/types/records";

export interface ToolContext {
    conversationId: number;
    service: SocketService;
}

export interface ToolOutcome {
    status: AiToolStatus;
    content: string;
    // The content holds a decrypted protected note.
    protected?: boolean;
}

export const done = (value: unknown): ToolOutcome => ({
    status: "done",
    content: JSON.stringify(value),
});

export const failed = (content: string): ToolOutcome => ({
    status: "failed",
    content,
});

export const declined = (content: string): ToolOutcome => ({
    status: "declined",
    content,
});
