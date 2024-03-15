import {
  FindUserFilters,
  findUsers,
} from "$backend/repository/user-repository.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";

export const handleFindUsers = guardHandler(CanManageUsers.List, async (
  req: Request,
): Promise<Response> => {
  const results = await findUsers(parseQueryParams<FindUserFilters>(req.url, {
    name: { type: "string", optional: true },
    username: { type: "string", optional: true },
    role: { type: "string", optional: true },
  }));

  return new Response(JSON.stringify(results));
});
