import { BinaryMessage, Message } from "$workers/websocket/types.ts";

type FileMessage<Type, Data = unknown> = Message<
    "files",
    Type,
    Data
>;

type BinaryFileMessage<Type, Data = unknown> = BinaryMessage<
    "files",
    Type,
    Data
>;

export type BeginFileMessage = FileMessage<
    "beginFile",
    { size: number; name: string; mimeType: string }
>;

export type BeginFileResponse = FileMessage<
    "beginFileResponse",
    { targetId: string }
>;

export type SendFileDataMessage = BinaryFileMessage<
    "sendFileData",
    { targetId: string }
>;

export type SendFileDataResponse = FileMessage<
    "sendFileDataResponse"
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
