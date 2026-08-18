import { AppState } from "$types";
import { AppPermissions } from "$backend/rbac/permissions.ts";
import { FreshContext } from "fresh";
import { roleDefinitions, Roles } from "$backend/rbac/role-definitions.ts";
import { Handler } from "fresh/compat";

export const guardHandler = <T>(
    requiredPermission: AppPermissions,
    handler: Handler<T, AppState>,
) =>
(ctx: FreshContext<AppState>) => {
    requirePemission(requiredPermission, ctx.state);
    return handler(ctx);
};

export const requirePemission = (
    permission: AppPermissions,
    { permissions }: AppState,
): void => {
    ``;
    if (!hasPermission(permission, { permissions })) {
        throw new Deno.errors.PermissionDenied(
            `User does not have the required permission: ${permission}`,
        );
    }
};

export const hasPermission = (
    permission: AppPermissions,
    { permissions }: AppState,
): boolean => permissions?.includes(permission) ?? false;

export const canRole = (
    role: Roles,
    checkPermission: AppPermissions,
): boolean =>
    (roleDefinitions[role].permissions as AppPermissions[]).includes(
        checkPermission,
    );

export const roleRequire = (
    role: Roles,
    requiredPermission: AppPermissions,
): void => {
    if (!canRole(role, requiredPermission)) {
        throw new Deno.errors.PermissionDenied(
            `User does not have the required permission: ${requiredPermission}`,
        );
    }
};
