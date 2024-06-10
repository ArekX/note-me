import { FreshContext } from "$fresh/server.ts";
import { getFileData } from "$backend/repository/file-repository.ts";
import { AppState } from "../../types/app-state.ts";

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const identifier: string = ctx.params.identifier ?? "";

    const userId = ctx.state.session?.getUserId()!;

    const file = await getFileData(identifier, userId);

    if (!file) {
        throw new Deno.errors.NotFound("Requested file not found.");
    }

    return new Response(file.data, {
        headers: {
            "Content-Type": file.mime_type,
            "Content-Disposition": `inline; filename="${file.name}"`,
        },
    });
};
