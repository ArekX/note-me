export interface MessageHeader<
    Namespace extends string = string,
    Type extends string = string,
> {
    requestId: string;
    namespace: Namespace;
    type: Type;
}

export type Message<
    Namespace extends string = string,
    Type extends string = string,
    Data = unknown,
> = MessageHeader<Namespace, Type> & Data;

export type BinaryMessage<
    Namespace extends string = string,
    Type extends string = string,
    Data = unknown,
> = Message<Namespace, Type, Data> & { binaryData: Uint8Array };

export type SocketMessage = Message | BinaryMessage;

export type ErrorMessage = Message<"system", "error", { message: string }>;

export type OperationResponseMessage<
    Namespace extends string = string,
    Type extends string = string,
> = Message<Namespace, Type, { success: boolean }>;

export type MessagePayload<T extends Message> = Omit<
    T,
    "requestId" | "namespace" | "type"
>;
