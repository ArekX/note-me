import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import { reloadDatabase } from "$backend/database.ts";
import { DatabaseRestoredMessage, SettingsBackendMessage } from "./messages.ts";

const handleDatabaseRestored: ListenerFn<DatabaseRestoredMessage> = () => {
    reloadDatabase();
};

export const backendMap: RegisterListenerMap<SettingsBackendMessage> = {
    databaseRestored: handleDatabaseRestored,
};
