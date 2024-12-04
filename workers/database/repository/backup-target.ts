import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    BackupTargetRecord,
    createBackupTarget,
    getTargetCount,
    updateBackupTarget,
} from "$backend/repository/backup-target-repository.ts";
import { BackupTargetRequest } from "$schemas/settings.ts";

type BackupRequest<Key extends string, Request, Response> = RepositoryRequest<
    "backupTarget",
    Key,
    Request,
    Response
>;

type GetTargetCount = BackupRequest<"getTargetCount", never, number>;
type CreateBackupTarget = BackupRequest<
    "createBackupTarget",
    BackupTargetRequest,
    BackupTargetRecord
>;
type UpdateBackupTarget = BackupRequest<
    "updateBackupTarget",
    { id: number; data: BackupTargetRequest },
    void
>;

export type BackupTargetRepository =
    | GetTargetCount
    | CreateBackupTarget
    | UpdateBackupTarget;

export const backupTarget: RepositoryHandlerMap<BackupTargetRepository> = {
    getTargetCount,
    createBackupTarget,
    updateBackupTarget: (data) => updateBackupTarget(data.id, data.data),
};
