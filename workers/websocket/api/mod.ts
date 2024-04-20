import { WebsocketService } from "$workers/websocket/websocket-service.ts";
import { notificationKindMap } from "$workers/websocket/api/notifications/mod.ts";
import { treeKindMap } from "$workers/websocket/api/tree/mod.ts";
import { groupKindMap } from "$workers/websocket/api/group/mod.ts";

export const registerApiHandlers = (service: WebsocketService) => {
    const { registerKindMap } = service;

    registerKindMap("notifications", notificationKindMap);
    registerKindMap("tree", treeKindMap);
    registerKindMap("groups", groupKindMap);
};
