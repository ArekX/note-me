import type { AiRound, AiStep } from "@/stores/ai";
import type { AiMessageRecord } from "@/types/records";

export interface ChatStep {
    id: string;
    name: string;
    title: string;
    arguments: unknown;
    status: AiStep["status"];
    result: string | null;
}

export type ChatPart =
    { kind: "text"; text: string } | { kind: "steps"; steps: ChatStep[] };

export type ChatItem =
    | { kind: "user"; key: string; text: string }
    | { kind: "assistant"; key: string; parts: ChatPart[] };

const labelKeys = ["title", "name", "query", "topic", "username", "identifier"];
const idKeys = ["id", "note_id", "folder_id", "target_id", "history_id"];

// The step list shows what each call was about, not its JSON.
export const stepLabel = (title: string, args: unknown) => {
    const values =
        typeof args === "object" && args !== null
            ? (args as Record<string, unknown>)
            : {};
    for (const key of labelKeys) {
        if (typeof values[key] === "string" && values[key]) {
            return `${title}: “${values[key]}”`;
        }
    }
    for (const key of idKeys) {
        if (typeof values[key] === "number") {
            return `${title} #${values[key]}`;
        }
    }
    return title;
};

// A stored assistant line runs from one user message to the next, with the
// text and the tool steps of every round in between.
export const groupMessages = (
    messages: AiMessageRecord[],
    titleOf: (name: string) => string,
): ChatItem[] => {
    const items: ChatItem[] = [];
    let assistant: Extract<ChatItem, { kind: "assistant" }> | null = null;
    const steps = new Map<string, ChatStep>();

    for (const message of messages) {
        if (message.role === "user") {
            assistant = null;
            items.push({
                kind: "user",
                key: `m${message.id}`,
                text: message.content,
            });
            continue;
        }
        if (!assistant) {
            assistant = { kind: "assistant", key: `m${message.id}`, parts: [] };
            items.push(assistant);
        }
        if (message.role === "assistant") {
            if (message.content) {
                assistant.parts.push({ kind: "text", text: message.content });
            }
            if (message.tool_calls?.length) {
                const roundSteps = message.tool_calls.map((call) => {
                    const step: ChatStep = {
                        id: call.id,
                        name: call.name,
                        title: titleOf(call.name),
                        arguments: call.arguments,
                        status: "failed",
                        result: null,
                    };
                    steps.set(call.id, step);
                    return step;
                });
                assistant.parts.push({ kind: "steps", steps: roundSteps });
            }
            continue;
        }
        const step = message.tool_call_id
            ? steps.get(message.tool_call_id)
            : undefined;
        if (step) {
            step.status = message.tool_status ?? "failed";
            step.result = message.content;
        }
    }
    return items;
};

export const turnParts = (rounds: AiRound[]): ChatPart[] =>
    rounds.flatMap((round): ChatPart[] => [
        ...(round.text ? [{ kind: "text" as const, text: round.text }] : []),
        ...(round.steps.length
            ? [
                  {
                      kind: "steps" as const,
                      steps: round.steps.map((step) => ({
                          id: step.call.id,
                          name: step.call.name,
                          title: step.call.title,
                          arguments: step.call.arguments,
                          status: step.status,
                          result: step.protected
                              ? "Protected note text, not shown here."
                              : step.result,
                      })),
                  },
              ]
            : []),
    ]);

export interface CreatedNote {
    id: number;
    title: string;
}

// Live results are the whole createNoteResponse, stored ones the trimmed
// result; both hold the record.
export const createdNotes = (steps: ChatStep[]): CreatedNote[] =>
    steps.flatMap((step) => {
        if (
            step.name !== "create_note" ||
            step.status !== "done" ||
            !step.result
        ) {
            return [];
        }
        try {
            const { record } = JSON.parse(step.result) as {
                record?: { id?: unknown; title?: unknown };
            };
            return typeof record?.id === "number"
                ? [{ id: record.id, title: String(record.title ?? "") }]
                : [];
        } catch {
            return [];
        }
    });

export type TurnStatus = "waiting" | "working" | "thinking" | "writing";

// What the live answer is doing; the last round is the one being written.
export const turnStatus = (rounds: AiRound[]): TurnStatus => {
    const steps = rounds.flatMap((round) => round.steps);
    if (steps.some((step) => step.status === "waiting")) {
        return "waiting";
    }
    if (steps.some((step) => step.status === "running")) {
        return "working";
    }
    return rounds.at(-1)?.text ? "writing" : "thinking";
};
