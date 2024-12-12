import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";
import {
    ExportOwnDataFailed,
    NotifyUserExportFailedMessage,
    NotifyUserExportFinishedMessage,
    NotifyUserExportUpdatedMessage,
} from "$workers/websocket/api/users/messages.ts";
import { UserBackendMessage } from "./messages.ts";
import { ExportOwnDataPercentageUpdate } from "$workers/websocket/api/users/messages.ts";
import { ExportOwnDataFinished } from "$workers/websocket/api/users/messages.ts";

const handleNotifyUserExportUpdated: ListenerFn<
    NotifyUserExportUpdatedMessage
> = ({
    message,
    service,
}) => {
    const client = service.getClientByUserId(message.user_id);

    client?.send<ExportOwnDataPercentageUpdate>({
        requestId: message.requestId,
        namespace: "users",
        type: "exportOwnDataPercentage",
        percentage: message.percentage,
        export_id: message.export_id,
    });
};

const handleNotifyUserExportFinished: ListenerFn<
    NotifyUserExportFinishedMessage
> = ({
    message,
    service,
}) => {
    const client = service.getClientByUserId(message.user_id);

    client?.send<ExportOwnDataFinished>({
        requestId: message.requestId,
        namespace: "users",
        type: "exportOwnDataFinished",
        export_id: message.export_id,
    });
};

const handleNotifyUserExportFailed: ListenerFn<
    NotifyUserExportFailedMessage
> = ({
    message,
    service,
}) => {
    const client = service.getClientByUserId(message.user_id);

    client?.send<ExportOwnDataFailed>({
        requestId: message.requestId,
        namespace: "users",
        type: "exportOwnDataFailed",
        export_id: message.export_id,
        message: message.message,
    });
};

export const backendMap: RegisterListenerMap<UserBackendMessage> = {
    notifyUserExportUpdated: handleNotifyUserExportUpdated,
    notifyUserExportFinished: handleNotifyUserExportFinished,
    notifyUserExportFailed: handleNotifyUserExportFailed,
};
