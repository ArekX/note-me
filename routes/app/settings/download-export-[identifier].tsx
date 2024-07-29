import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { getExportLocation } from "$backend/export-generator.ts";
import { exists } from "$std/fs/exists.ts";

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const location = getExportLocation(
        ctx.params.identifier,
        ctx.state.session?.getUserId()!,
    );

    if (!await exists(location)) {
        throw new Deno.errors.NotFound("Export not found.");
    }

    const stat = await Deno.stat(location);
    const file = await Deno.open(location, { read: true });

    return new Response(file.readable, {
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition":
                `attachment; filename="${ctx.params.identifier}.zip"`,
            "Content-Length": stat.size.toString(),
            "Cache-Control": "no-cache",
        },
    });
};
