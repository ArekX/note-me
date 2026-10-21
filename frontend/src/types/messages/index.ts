import type { AiFrontendMessage, AiFrontendResponse } from "./ai";
import type { ErrorMessage } from "./base";
import type { ChangesFrontendResponse } from "./changes";
import type { FileFrontendMessage, FileFrontendResponse } from "./files";
import type { GroupFrontendMessage, GroupFrontendResponse } from "./groups";
import type {
    NoteBackendMessage,
    NoteFrontendMessage,
    NoteFrontendResponse,
} from "./notes";
import type {
    NotificationBackendMessage,
    NotificationFrontendMessage,
    NotificationFrontendResponse,
} from "./notifications";
import type {
    SettingsFrontendMessage,
    SettingsFrontendResponse,
} from "./settings";
import type { TagFrontendMessage, TagFrontendResponse } from "./tags";
import type { TreeFrontendMessage, TreeFrontendResponse } from "./tree";
import type {
    UserBackendMessage,
    UserFrontendMessage,
    UserFrontendResponse,
} from "./users";

export * from "./ai";
export * from "./base";
export * from "./changes";
export * from "./files";
export * from "./groups";
export * from "./notes";
export * from "./notifications";
export * from "./settings";
export * from "./tags";
export * from "./tree";
export * from "./users";

export type FrontendMessage =
    | NotificationFrontendMessage
    | TreeFrontendMessage
    | GroupFrontendMessage
    | NoteFrontendMessage
    | TagFrontendMessage
    | UserFrontendMessage
    | FileFrontendMessage
    | SettingsFrontendMessage
    | AiFrontendMessage;

export type FrontendResponse =
    | NotificationFrontendResponse
    | TreeFrontendResponse
    | GroupFrontendResponse
    | NoteFrontendResponse
    | TagFrontendResponse
    | UserFrontendResponse
    | FileFrontendResponse
    | SettingsFrontendResponse
    | ChangesFrontendResponse
    | AiFrontendResponse
    | ErrorMessage;

export type BackendMessage =
    NotificationBackendMessage | NoteBackendMessage | UserBackendMessage;

export type Namespace = FrontendMessage["namespace"];
