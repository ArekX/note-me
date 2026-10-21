// Keep in sync with the server's roles and permissions.

export const CanManageUsers = { Update: "canUpdateUsers" } as const;
export const CanManageTags = {
    Read: "canReadTags",
    Update: "canUpdateTags",
} as const;
export const CanManageBackups = { Update: "canManageBackups" } as const;
export const CanManageFiles = { AllFiles: "canManageAllFiles" } as const;
export const CanManagePeriodicTasks = {
    View: "canViewPeriodicTasks",
    Run: "canRunPeriodicTasks",
} as const;
export const CanViewAuditLog = { View: "canViewAuditLog" } as const;
export const CanViewServerLog = { View: "canViewServerLog" } as const;
export const CanManageAiProviders = { Update: "canManageAiProviders" } as const;

export type AppPermission =
    | (typeof CanManageUsers)[keyof typeof CanManageUsers]
    | (typeof CanManageTags)[keyof typeof CanManageTags]
    | (typeof CanManageBackups)[keyof typeof CanManageBackups]
    | (typeof CanManageFiles)[keyof typeof CanManageFiles]
    | (typeof CanManagePeriodicTasks)[keyof typeof CanManagePeriodicTasks]
    | (typeof CanViewAuditLog)[keyof typeof CanViewAuditLog]
    | (typeof CanViewServerLog)[keyof typeof CanViewServerLog]
    | (typeof CanManageAiProviders)[keyof typeof CanManageAiProviders];

interface RoleDefinition {
    name: string;
    permissions: AppPermission[];
}

export const roleDefinitions = {
    admin: {
        name: "Admin",
        permissions: [
            ...Object.values(CanManageUsers),
            ...Object.values(CanManageTags),
            ...Object.values(CanManageFiles),
            ...Object.values(CanManagePeriodicTasks),
            ...Object.values(CanManageBackups),
            ...Object.values(CanViewAuditLog),
            ...Object.values(CanViewServerLog),
            ...Object.values(CanManageAiProviders),
        ],
    },
    user: {
        name: "User",
        permissions: [CanManageTags.Read],
    },
} satisfies Record<string, RoleDefinition>;

export type Role = keyof typeof roleDefinitions;

const settingsPermissions: AppPermission[] = [
    CanManageUsers.Update,
    CanManageBackups.Update,
    CanManageTags.Update,
    CanManageFiles.AllFiles,
    CanManagePeriodicTasks.View,
    CanViewAuditLog.View,
    CanViewServerLog.View,
    CanManageAiProviders.Update,
];

export const roleNames = Object.keys(roleDefinitions) as Role[];

export const roleLabelMap = Object.fromEntries(
    Object.entries(roleDefinitions).map(([key, role]) => [key, role.name]),
) as Record<Role, string>;

export const roleDropDownList = Object.entries(roleDefinitions).map(
    ([value, { name: label }]) => ({ label, value: value as Role }),
);

export const canRole = (role: Role, permission: AppPermission): boolean =>
    (roleDefinitions[role]?.permissions as AppPermission[]).includes(
        permission,
    );

export const hasSettingsPermission = (permissions: AppPermission[]): boolean =>
    settingsPermissions.some((permission) => permissions.includes(permission));

export const canAccessSettings = (role: Role): boolean =>
    hasSettingsPermission(roleDefinitions[role]?.permissions ?? []);
