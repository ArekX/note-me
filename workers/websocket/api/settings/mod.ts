import { RegisterKindMap } from "$workers/websocket/types.ts";
import { backendMap } from "$workers/websocket/api/settings/backend.ts";
import { frontendMap } from "./frontend.ts";
import { SettingsBackendMessage, SettingsFrontendMessage } from "./messages.ts";

export const settingsKindMap: RegisterKindMap<
    SettingsBackendMessage,
    SettingsFrontendMessage
> = {
    backend: backendMap,
    frontend: frontendMap,
};
