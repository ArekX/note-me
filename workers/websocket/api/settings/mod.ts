import { RegisterFrontendKindMap } from "$workers/websocket/types.ts";
import { frontendMap } from "./frontend.ts";
import { SettingsFrontendMessage } from "./messages.ts";

export const settingsKindMap: RegisterFrontendKindMap<
    SettingsFrontendMessage
> = {
    frontend: frontendMap,
};
