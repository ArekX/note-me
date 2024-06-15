import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "./frontend.ts";
import { FileFrontendMessage } from "./messages.ts";

export const fileKindMap: RegisterFrontendKindMap<
    FileFrontendMessage
> = {
    frontend: frontendMap,
};
