import {
    AppPermissions,
    CanManageBackups,
    CanManageFiles,
    CanManagePeriodicTasks,
    CanManageTags,
    CanManageUsers,
} from "./permissions.ts";

interface RoleDefinition {
    name: string;
    permissions: AppPermissions[];
}

type RoleDefinitionMap = { [key: string]: RoleDefinition };

export const roleDefinitions = {
    admin: {
        name: "Admin",
        permissions: [
            ...Object.values(CanManageUsers),
            ...Object.values(CanManageTags),
            ...Object.values(CanManageFiles),
            ...Object.values(CanManagePeriodicTasks),
            ...Object.values(CanManageBackups),
        ],
    },
    user: {
        name: "User",
        permissions: [
            CanManageTags.Read,
        ],
    },
} satisfies RoleDefinitionMap;

const settingsPermissions: AppPermissions[] = [
    CanManageUsers.Update,
    CanManageBackups.Update,
    CanManageTags.Read,
    CanManageFiles.AllFiles,
    CanManagePeriodicTasks.View,
];

export type Roles = keyof typeof roleDefinitions;

export const canAccessSettings = (role: Roles) => {
    const intersection = roleDefinitions[role].permissions.filter((p) =>
        settingsPermissions.includes(p)
    );

    return intersection.length > 0;
};

export const roleLabelMap = Object.entries(roleDefinitions).reduce(
    (map, [key, role]) => {
        map[key as Roles] = role.name;
        return map;
    },
    {} as { [key in Roles]: string },
);

export const roleDropDownList = Object.entries(roleDefinitions).map(
    ([value, { name: label }]) => ({ label, value }),
);

export const roleNames = Object.keys(roleDefinitions) as Roles[];
