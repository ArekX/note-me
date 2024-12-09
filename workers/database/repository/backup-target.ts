import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    BackupTargetRecord,
    clearAllBackupInProgress,
    createBackupTarget,
    deleteBackupTarget,
    getBackupTarget,
    getBackupTargets,
    getTargetCount,
    isBackupInProgress,
    updateBackupInProgress,
    updateBackupTarget,
    updateLastBackupAt,
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
type GetBackupTarget = BackupRequest<
    "getBackupTarget",
    number,
    BackupTargetRecord | null
>;
type GetBackupTargets = BackupRequest<
    "getBackupTargets",
    never,
    BackupTargetRecord[]
>;
type DeleteBackupTarget = BackupRequest<"deleteBackupTarget", number, void>;
type IsBackupInProgress = BackupRequest<"isBackupInProgress", number, boolean>;
type UpdateLastBackupAt = BackupRequest<"updateLastBackupAt", number, void>;
type UpdateBackupInProgress = BackupRequest<"updateBackupInProgress", {
    id: number;
    inProgress: boolean;
}, void>;
type ClearAllBackupInProgress = BackupRequest<
    "clearAllBackupInProgress",
    never,
    void
>;

export type BackupTargetRepository =
    | GetTargetCount
    | CreateBackupTarget
    | UpdateBackupTarget
    | GetBackupTarget
    | GetBackupTargets
    | DeleteBackupTarget
    | IsBackupInProgress
    | UpdateLastBackupAt
    | UpdateBackupInProgress
    | ClearAllBackupInProgress;

export const backupTarget: RepositoryHandlerMap<BackupTargetRepository> = {
    getTargetCount,
    createBackupTarget,
    updateBackupTarget: ({ id, data }) => updateBackupTarget(id, data),
    getBackupTarget,
    getBackupTargets,
    deleteBackupTarget,
    isBackupInProgress,
    updateLastBackupAt,
    updateBackupInProgress: ({ id, inProgress }) =>
        updateBackupInProgress(id, inProgress),
    clearAllBackupInProgress,
};
