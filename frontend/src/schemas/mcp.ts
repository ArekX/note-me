import { zod } from "./index";
import { mcpClientKinds } from "@/types/records";

// RFC 8252: native apps listen on a loopback address over plain http.
const loopbackHosts = new Set(["127.0.0.1", "[::1]", "localhost"]);

const isAllowedRedirectUri = (value: string): boolean => {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }
    return (
        url.protocol === "https:" ||
        (url.protocol === "http:" && loopbackHosts.has(url.hostname))
    );
};

const redirectUriIssue = (uri: string): string | null => {
    if (uri.length > 2048) {
        return "Redirect URI must have at most 2048 characters";
    }
    return isAllowedRedirectUri(uri)
        ? null
        : "Redirect URI must use https, or http on localhost.";
};

// Updates send no kind; the client's own kind applies to them.
// Every redirect URI issue is on the list, as the server reports them.
export const mcpClientSchema = zod
    .object({
        name: zod
            .string()
            .trim()
            .min(1, "Name must have at least one character")
            .max(255, "Name must have at most 255 characters"),
        kind: zod.enum(mcpClientKinds),
        is_read_only: zod.boolean(),
        redirect_uris: zod.array(zod.string()),
    })
    .strict()
    .superRefine(({ kind, redirect_uris }, ctx) => {
        if (kind !== "oauth") {
            return;
        }
        const messages = new Set<string>();
        if (redirect_uris.length === 0) {
            messages.add("Add at least one redirect URI.");
        }
        if (redirect_uris.length > 10) {
            messages.add("At most 10 redirect URIs are allowed.");
        }
        for (const uri of redirect_uris) {
            const message = redirectUriIssue(uri);
            if (message) {
                messages.add(message);
            }
        }
        for (const message of messages) {
            ctx.addIssue({ code: "custom", path: ["redirect_uris"], message });
        }
    });

export type NewMcpClientRequest = zod.infer<typeof mcpClientSchema>;
export type McpClientRequest = Omit<NewMcpClientRequest, "kind">;
