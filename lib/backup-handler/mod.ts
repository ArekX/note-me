import {
    BackupTarget,
    handlers,
    SettingsMap,
    TargetSettings,
} from "$lib/backup-handler/handlers.ts";
import { TargetType } from "$lib/backup-handler/handlers.ts";
import { TargetMap } from "$lib/backup-handler/handlers.ts";

export interface BackupItem {
    identifier: string;
    name: string;
    created_at: number;
    size: number;
}

export interface CreateBackupTarget<
    Type extends string,
    Settings extends object,
> {
    type: Type;
    create: (settings: Settings) => BackupTargetHandler<Type>;
}

export interface BackupTargetHandler<Name extends string> {
    name: Name;
    setup(): Promise<void>;
    initialize(): Promise<void>;
    createBackup(): Promise<BackupItem>;
    deleteBackup(identifier: BackupItem["identifier"]): Promise<void>;
    getDownloadLink(identifier: BackupItem["identifier"]): Promise<string>;
    listBackups(): Promise<BackupItem[]>;
}

export const createBackupHandler = <T extends TargetType>(
    type: T,
    settings: SettingsMap[T],
): BackupTargetHandler<T> => {
    const internalHandler = (handlers[type] as CreateBackupTarget<
        TargetType,
        TargetSettings
    >).create(settings);

    return internalHandler as BackupTargetHandler<T>;
};
