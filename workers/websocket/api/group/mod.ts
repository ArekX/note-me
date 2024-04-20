import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "$workers/websocket/api/group/frontend.ts";
import { GroupFrontendMessage } from "./messages.ts";

export const groupKindMap: RegisterFrontendKindMap<
    GroupFrontendMessage
> = {
    frontend: frontendMap,
};
