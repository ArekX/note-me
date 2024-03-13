import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { findUsers } from "$backend/repository/user-repository.ts";

export interface FindNotesRequest {
  search?: string;
}

export const handleFindUsers = async (
  _req: Request,
): Promise<Response> => {
  const results = await findUsers({});

  return new Response(JSON.stringify(results));
};
