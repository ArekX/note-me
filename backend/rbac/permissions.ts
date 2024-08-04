export enum CanManageUsers {
    Update = "canUpdateUsers",
}

export enum CanManageTags {
    Read = "canReadTags",
    Update = "canUpdateTags",
}

export enum CanManageBackups {
    Update = "canManageBackups",
}

export enum CanManageFiles {
    AllFiles = "canManageAllFiles",
}

export enum CanManagePeriodicTasks {
    View = "canViewPeriodicTasks",
}

export type AppPermissions =
    | CanManageUsers
    | CanManageTags
    | CanManageFiles
    | CanManagePeriodicTasks
    | CanManageBackups;
