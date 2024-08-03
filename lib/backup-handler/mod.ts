export interface BackupItem {
    identifier: string;
    name: string;
    created_at: number;
    size: number;
}

export interface BackupTargetHandler<Name extends string> {
    name: Name;
    initialize(): Promise<void>;
    createBackup(): Promise<BackupItem>;
    deleteBackup(identifier: BackupItem["identifier"]): Promise<void>;
    getDownloadLink(identifier: BackupItem["identifier"]): Promise<string>;
    listBackups(): Promise<BackupItem[]>;
}
