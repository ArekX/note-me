export enum CanManageUsers {
    List = "canListUsers",
    Create = "canCreateUser",
    Read = "canUpdateUser",
    Update = "canUpdateUser",
    Delete = "canDeleteUser",
}

export enum CanManageTags {
    List = "canListTags",
    Create = "canCreateTag",
    Read = "canUpdateTag",
    Update = "canUpdateTag",
    Delete = "canDeleteTag",
}

export enum CanManageSettings {
    Update = "canUpdateGeneralSettings",
}

export enum CanManageBackups {
    Restore = "canRestoreBackups",
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
    | CanManageSettings
    | CanManageFiles
    | CanManagePeriodicTasks
    | CanManageBackups;
