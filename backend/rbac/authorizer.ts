import { AppState } from "$types";
import { AppPermissions } from "$backend/rbac/permissions.ts";
import { FreshContext, Handler } from "$fresh/server.ts";
import { roleDefinitions, Roles } from "$backend/rbac/role-definitions.ts";

export const guardHandler = <T>(
    requiredPermission: AppPermissions,
    handler: Handler<T, AppState>,
) =>
(request: Request, ctx: FreshContext<AppState>) => {
    requirePemission(requiredPermission, ctx.state);
    return handler(request, ctx);
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
