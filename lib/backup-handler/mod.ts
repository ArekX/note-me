import {
    handlers,
    SettingsMap,
    TargetSettings,
} from "$lib/backup-handler/handlers.ts";
import { TargetType } from "$lib/backup-handler/handlers.ts";

export type BackupIdentifier = string;

export interface BackupItem {
    identifier: BackupIdentifier;
    name: string;
    created_at: number;
    size: number;
}

export interface BackupInputRecord {
    identifier: BackupIdentifier;
    inputLocation: string;
}

export interface CreateBackupTarget<
    Type extends string,
    Settings extends object,
> {
    type: Type;
    create: (
        settings: Settings,
    ) => BackupTargetHandler<Type>;
}

export interface BackupStream {
    identifier: BackupIdentifier;
    size: number;
    stream: ReadableStream;
}

export interface BackupTargetHandler<Name extends string> {
    name: Name;
    setup(): Promise<void>;
    saveBackup(record: BackupInputRecord): Promise<BackupItem>;
    deleteBackup(identifier: BackupIdentifier): Promise<void>;
    getBackupStream(identifier: BackupIdentifier): Promise<BackupStream>;
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
