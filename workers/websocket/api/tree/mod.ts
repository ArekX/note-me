import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "$workers/websocket/api/tree/frontend.ts";
import { TreeFrontendMessage } from "./messages.ts";

export const treeKindMap: RegisterFrontendKindMap<
    TreeFrontendMessage
> = {
    frontend: frontendMap,
};
