import { RegisterKindMap } from "$workers/websocket/types.ts";
import { backendMap } from "./backend.ts";
import { frontendMap } from "$workers/websocket/api/notifications/frontend.ts";
import {
    NotificationBackendMessage,
    NotificationFrontendMessage,
} from "./messages.ts";

export const notificationKindMap: RegisterKindMap<
    NotificationBackendMessage,
    NotificationFrontendMessage
> = {
    backend: backendMap,
    frontend: frontendMap,
};
