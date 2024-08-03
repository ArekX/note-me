import {
    LocalBackupTargetHandler,
    localHandler,
} from "$lib/backup-handler/targets/local.ts";
import {
    S3BackupTargetHandler,
    s3Handler,
} from "$lib/backup-handler/targets/s3.ts";

export type BackupHandler = LocalBackupTargetHandler | S3BackupTargetHandler;

export type HandlerMap = {
    [K in BackupHandler["name"]]: Extract<BackupHandler, { name: K }>;
};

export const handlers: HandlerMap = {
    local: localHandler,
    s3: s3Handler,
};
