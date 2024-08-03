import { BackupItem, CreateBackupTarget } from "$lib/backup-handler/mod.ts";

export interface S3BackupSettings {
    bucket: string;
    prefix: string;
    region: string;
    access_key_id?: string;
    secret_access_key?: string;
    download_timeout?: number;
}

export const s3BackupTarget: CreateBackupTarget<"s3", S3BackupSettings> = {
    type: "s3",
    create: (settings) => {
        return {
            name: "s3",
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
