import { FreshContext } from "$fresh/server.ts";
import { getUserGroups } from "$backend/repository/group-repository.ts";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";

export interface FindGroupsRequest {
  parent_id?: string;
}

export const handleFindGroups = async (
  req: Request,
  ctx: FreshContext<AppState>,
): Promise<Response> => {
  const params = parseQueryParams<FindGroupsRequest>(req.url, {
    parent_id: { type: "number", optional: true },
  });

  const results = await getUserGroups(
    params.parent_id ?? null,
    ctx.state.session?.data.user?.id ?? -1,
  );

  return new Response(JSON.stringify(results));
};
