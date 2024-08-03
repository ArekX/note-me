import { BackupItem, BackupTargetHandler } from "$lib/backup-handler/mod.ts";

export type S3BackupTargetHandler = BackupTargetHandler<"s3">;

export const s3Handler: S3BackupTargetHandler = {
    name: "s3",
    initialize: function (): Promise<void> {
        throw new Error("Function not implemented.");
    },
    createBackup: function (): Promise<BackupItem> {
        throw new Error("Function not implemented.");
    },
    deleteBackup: function (
        identifier: BackupItem["identifier"],
    ): Promise<void> {
        throw new Error("Function not implemented.");
    },
    getDownloadLink: function (
        identifier: BackupItem["identifier"],
    ): Promise<string> {
        throw new Error("Function not implemented.");
    },
    listBackups: function (): Promise<BackupItem[]> {
        throw new Error("Function not implemented.");
    },
};
