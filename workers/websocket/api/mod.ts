import { WebsocketService } from "$workers/websocket/websocket-service.ts";
import { notificationKindMap } from "$workers/websocket/api/notifications/mod.ts";
import { treeKindMap } from "$workers/websocket/api/tree/mod.ts";
import { groupKindMap } from "./groups/mod.ts";
import { noteKindMap } from "$workers/websocket/api/notes/mod.ts";
import { tagKindMap } from "$workers/websocket/api/tags/mod.ts";
import { userKindMap } from "$workers/websocket/api/users/mod.ts";
import { fileKindMap } from "./files/mod.ts";
import { settingsKindMap } from "$workers/websocket/api/settings/mod.ts";

export const registerApiHandlers = (service: WebsocketService) => {
    const { registerKindMap } = service;

    registerKindMap("notifications", notificationKindMap);
    registerKindMap("tree", treeKindMap);
    registerKindMap("groups", groupKindMap);
    registerKindMap("notes", noteKindMap);
    registerKindMap("tags", tagKindMap);
    registerKindMap("users", userKindMap);
    registerKindMap("files", fileKindMap);
    registerKindMap("settings", settingsKindMap);
};
