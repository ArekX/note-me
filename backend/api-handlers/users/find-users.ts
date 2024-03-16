import {
    FindUserFilters,
    findUsers,
} from "$backend/repository/user-repository.ts";
import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";

export interface FindUserRequest extends FindUserFilters {
    page: number;
}

export const handleFindUsers = guardHandler(CanManageUsers.List, async (
    req: Request,
): Promise<Response> => {
    const data = parseQueryParams<FindUserRequest>(req.url, {
        name: { type: "string", optional: true },
        username: { type: "string", optional: true },
        role: { type: "string", optional: true },
        page: { type: "number", optional: true, default: "1" },
    });
    const results = await findUsers({
        name: data.name,
        username: data.username,
        role: data.role,
    }, data.page);

    return new Response(JSON.stringify(results));
});
