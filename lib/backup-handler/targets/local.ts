import { BackupItem, CreateBackupTarget } from "$lib/backup-handler/mod.ts";

export interface LocalBackupSettings {
    location: string;
}

export const localBackupTarget: CreateBackupTarget<
    "local",
    LocalBackupSettings
> = {
    type: "local",
    create: (settings) => {
        return {
            name: "local",
            setup: async function (): Promise<void> {
                throw new Error("Function not implemented.");
            },
            initialize: async function (): Promise<void> {
                throw new Error("Function not implemented.");
            },
            createBackup: async function (): Promise<BackupItem> {
                throw new Error("Function not implemented.");
            },
            deleteBackup: async function (
                identifier: BackupItem["identifier"],
            ): Promise<void> {
                throw new Error("Function not implemented.");
            },
            getDownloadLink: async function (
                identifier: BackupItem["identifier"],
            ): Promise<string> {
                throw new Error("Function not implemented.");
            },
            listBackups: async function (): Promise<BackupItem[]> {
                throw new Error("Function not implemented.");
            },
        };
    },
};
