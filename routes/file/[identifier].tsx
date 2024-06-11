import { FreshContext } from "$fresh/server.ts";
import { getFileData } from "$backend/repository/file-repository.ts";
import { AppState } from "$types";

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const identifier: string = ctx.params.identifier ?? "";

    const userId = ctx.state.session?.getUserId()!;

    const file = await getFileData(identifier, userId);

    if (!file) {
        throw new Deno.errors.NotFound("Requested file not found.");
    }

    const disposition = ctx.url.searchParams.has("download")
        ? "attachment"
        : "inline";

    return new Response(file.data, {
        headers: {
            "Content-Type": file.mime_type,
            "Content-Disposition": `${disposition}; filename="${file.name}"`,
            "Content-Length": file.size.toString(),
            "Cache-Control": "public, max-age=604800, immutable", // 1 week
            "ETag": identifier,
        },
    });
};
