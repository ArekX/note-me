import { CanManageUsers } from "$backend/rbac/permissions.ts";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { guardHandler } from "$backend/rbac/authorizer.ts";
import { toPagedList } from "$backend/api-responses.ts";
import {
    FindTagFilters,
    findTags,
} from "$backend/repository/note-tags-repository.ts";

export interface FindTagRequest extends FindTagFilters {
    page: number;
}

export const handleFindTags = guardHandler(CanManageUsers.List, async (
    req: Request,
): Promise<Response> => {
    const { page, ...filters } = parseQueryParams<FindTagRequest>(
        req.url,
        {
            name: { type: "string", optional: true },
            page: { type: "number", optional: true, default: "1" },
        },
    );

    return toPagedList(await findTags(filters, page));
});
