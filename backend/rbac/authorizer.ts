import { AppState } from "$types";
import { AppPermissions } from "$backend/rbac/permissions.ts";
import { FreshContext, Handler } from "$fresh/server.ts";

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
