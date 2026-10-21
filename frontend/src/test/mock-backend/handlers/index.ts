import type { Message } from "@/types/messages";
import type { MockHandler, MockHandlerMap } from "../handler";
import { aiHandlers } from "./ai";
import { filesHandlers } from "./files";
import { groupsHandlers } from "./groups";
import { notesHandlers } from "./notes";
import { notificationsHandlers } from "./notifications";
import { settingsHandlers } from "./settings";
import { tagsHandlers } from "./tags";
import { treeHandlers } from "./tree";
import { usersHandlers } from "./users";

const untyped = <T extends Message>(map: MockHandlerMap<T>) =>
    map as unknown as Record<string, MockHandler>;

export const mockHandlers: Record<string, Record<string, MockHandler>> = {
    notifications: untyped(notificationsHandlers),
    tree: untyped(treeHandlers),
    groups: untyped(groupsHandlers),
    notes: untyped(notesHandlers),
    tags: untyped(tagsHandlers),
    users: untyped(usersHandlers),
    files: untyped(filesHandlers),
    settings: untyped(settingsHandlers),
    ai: untyped(aiHandlers),
};
