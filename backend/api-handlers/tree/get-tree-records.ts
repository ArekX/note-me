import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { toResultList } from "$backend/api-responses.ts";
import { getTreeList } from "$backend/repository/tree-list.repository.ts";

export interface GetTreeRequest {
    parent_id?: number;
}

export const getTreeRecords = async (
    req: Request,
    ctx: FreshContext<AppState>,
): Promise<Response> => {
    const params = parseQueryParams<GetTreeRequest>(req.url, {
        parent_id: { type: "number", optional: true },
    });

    const results = await getTreeList(
        params.parent_id ?? null,
        ctx.state.session?.getUserId()!,
    );

    return toResultList(results);
};
