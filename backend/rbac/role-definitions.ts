import {
    AppPermissions,
    CanManageSettings,
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
            ...Object.values(CanManageSettings),
            ...Object.values(CanManageTags),
        ],
    },
    user: {
        name: "User",
        permissions: [],
    },
} satisfies RoleDefinitionMap;

export type Roles = keyof typeof roleDefinitions;

export const roleNames = Object.keys(roleDefinitions) as Roles[];
