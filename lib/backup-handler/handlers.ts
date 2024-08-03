import { localBackupTarget } from "$lib/backup-handler/targets/local.ts";
import { s3BackupTarget } from "$lib/backup-handler/targets/s3.ts";

export type BackupTarget =
    | typeof localBackupTarget
    | typeof s3BackupTarget;

export type TargetMap = {
    [K in BackupTarget["type"]]: Extract<
        BackupTarget,
        { type: K }
    >;
};

export type SettingsMap = {
    [K in TargetType]: Parameters<TargetMap[K]["create"]>[0];
};

export type TargetType = keyof TargetMap;

export type TargetSettings = Parameters<BackupTarget["create"]>[0];

export const handlers: TargetMap = {
    local: localBackupTarget,
    s3: s3BackupTarget,
};
