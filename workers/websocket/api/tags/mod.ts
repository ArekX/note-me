import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "$workers/websocket/api/tags/frontend.ts";
import { TagFrontendMessage } from "./messages.ts";

export const tagKindMap: RegisterFrontendKindMap<
    TagFrontendMessage
> = {
    frontend: frontendMap,
};
