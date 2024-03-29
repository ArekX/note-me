import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { toResultList } from "$backend/api-responses.ts";

export interface FindTreeRequest {
    query: string;
    page: number;
}

export const findTreeRecords = (
    req: Request,
    _ctx: FreshContext<AppState>,
): Promise<Response> => {
    const _params = parseQueryParams<FindTreeRequest>(req.url, {
        query: { type: "string" },
        page: { type: "number", optional: true, default: "1" },
    });

    return Promise.resolve(toResultList([]));
};
