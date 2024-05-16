import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "$workers/websocket/api/users/frontend.ts";
import { UserFrontendMessage } from "./messages.ts";

export const userKindMap: RegisterFrontendKindMap<
    UserFrontendMessage
> = {
    frontend: frontendMap,
};
