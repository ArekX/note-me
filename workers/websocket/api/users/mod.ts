import { RegisterKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "$workers/websocket/api/users/frontend.ts";
import { UserBackendMessage, UserFrontendMessage } from "./messages.ts";
import { backendMap } from "$workers/websocket/api/users/backend.ts";

export const userKindMap: RegisterKindMap<
    UserBackendMessage,
    UserFrontendMessage
> = {
    backend: backendMap,
    frontend: frontendMap,
};
