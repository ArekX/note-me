import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "./frontend.ts";
import { GroupFrontendMessage } from "./messages.ts";

export const groupKindMap: RegisterFrontendKindMap<
    GroupFrontendMessage
> = {
    frontend: frontendMap,
};
