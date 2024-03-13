import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { roleDefinitions } from "$backend/rbac/role-definitions.ts";
import { AppPermissions } from "$backend/rbac/permissions.ts";

export const loadPermissions = (
  _req: Request,
  ctx: FreshContext<AppState>,
) => {
  if (!ctx.state.session?.data?.user) {
    return ctx.next();
  }

  const role = ctx.state.session.data.user.role;

  ctx.state.permissions =
    roleDefinitions[role].permissions as AppPermissions[] ??
      [];

  return ctx.next();
};
