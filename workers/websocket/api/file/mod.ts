import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "./frontend.ts";
import { FileFrontendMessage } from "./messages.ts";

export const noteKindMap: RegisterFrontendKindMap<
    FileFrontendMessage
> = {
    frontend: frontendMap,
};
