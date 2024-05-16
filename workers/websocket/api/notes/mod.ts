import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "$workers/websocket/api/notes/frontend.ts";
import { NoteFrontendMessage } from "./messages.ts";

export const noteKindMap: RegisterFrontendKindMap<
    NoteFrontendMessage
> = {
    frontend: frontendMap,
};
