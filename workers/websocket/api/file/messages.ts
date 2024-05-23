import { Message } from "$workers/websocket/types.ts";

type FileMessage<Type, Data = unknown> = Message<
    "files",
    Type,
    Data
>;

export type BeginFileMessage = FileMessage<
    "beginFile"
>;

export type BeginFileResponse = FileMessage<
    "beginFileResponse",
    { targetId: string }
>;

export type SendFileDataMessage = FileMessage<
    "sendFileData",
    { targetId: string; chunk: string }
>;

export type SendFileDataResponse = FileMessage<
    "updateNoteResponse"
>;

export type EndFileMessage = FileMessage<
    "endFile",
    { targetId: string }
>;

export type EndFileResponse = FileMessage<
    "endFileResponse"
>;

export type FileFrontendResponse =
    | BeginFileResponse
    | SendFileDataResponse
    | EndFileResponse;

export type FileFrontendMessage =
    | BeginFileMessage
    | SendFileDataMessage
    | EndFileMessage;
