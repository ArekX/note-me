import { RegisterListenerMap } from "$workers/websocket/types.ts";

import { FileFrontendMessage } from "./messages.ts";

export const frontendMap: RegisterListenerMap<FileFrontendMessage> = {};
