import { socketErrorMessage } from "@/lib/error-messages";
import type {
    GetNoteDetailsMessage,
    GetNoteDetailsResponse,
    Message,
} from "@/types/messages";
import type { AiToolCallRequest } from "@/types/records";
import { browserTools } from "./browser-tools";
import {
    DENIED_TEXT,
    decryptText,
    encryptText,
    ensureProtectedAccess,
} from "./protected-notes";
import {
    declined,
    done,
    failed,
    type ToolContext,
    type ToolOutcome,
} from "./tool-outcome";

type Payload = Record<string, unknown>;

const allowed = (context: ToolContext) =>
    ensureProtectedAccess(context.conversationId);

// New text for a protected note is encrypted before it is sent.
const protectWrite = async (
    payload: Payload,
    context: ToolContext,
): Promise<ToolOutcome | null> => {
    const data = payload.data as Payload | undefined;
    if (typeof data?.text !== "string") {
        return null;
    }
    const { record } = await context.service.sendMessage<
        GetNoteDetailsMessage,
        GetNoteDetailsResponse
    >("notes", "getNoteDetails", {
        data: { id: Number(payload.id), options: {} },
        expect: "getNoteDetailsResponse",
    });
    if (!record.is_encrypted) {
        return null;
    }
    if (!(await allowed(context))) {
        return declined(DENIED_TEXT);
    }
    data.text = await encryptText(context.service, data.text);
    return null;
};

// get_note answers with record, get_history_version with data.
const protectRead = async (
    response: Payload,
    context: ToolContext,
): Promise<ToolOutcome> => {
    const record = (response.record ?? response.data) as Payload | undefined;
    if (
        !record?.is_encrypted ||
        typeof record.note !== "string" ||
        !record.note
    ) {
        return done(response);
    }
    if (!(await allowed(context))) {
        return declined(DENIED_TEXT);
    }
    record.note = await decryptText(context.service, record.note);
    return { ...done(response), protected: true };
};

// The call runs as an ordinary websocket message under the user's session,
// so the handler checks it like any other request.
export const runToolCall = async (
    call: AiToolCallRequest,
    context: ToolContext,
): Promise<ToolOutcome> => {
    try {
        const args = (call.arguments ?? {}) as Payload;
        if (call.browser) {
            const run = browserTools[call.name];
            return run
                ? await run(args, context)
                : failed(`The browser cannot run ${call.name}.`);
        }
        if (!call.message) {
            return failed(`${call.name} has no message to send.`);
        }
        const { namespace, type, expect, timeout_ms } = call.message;
        // The call sits in reactive state, which structuredClone cannot copy.
        const payload = JSON.parse(JSON.stringify(call.message.payload));
        if (call.protected === "write") {
            const refused = await protectWrite(payload, context);
            if (refused) {
                return refused;
            }
        }
        const response = await context.service.sendMessage<Message, Message>(
            namespace,
            type,
            {
                data: payload as never,
                expect,
                timeoutMs: timeout_ms,
                notOwn: true,
            },
        );
        return call.protected === "read"
            ? await protectRead(response as unknown as Payload, context)
            : done(response);
    } catch (error) {
        return failed(socketErrorMessage(error));
    }
};
