import { FreshContext } from "$fresh/server.ts";
import { getFileData } from "$backend/repository/file-repository.ts";
import { AppState } from "$types";
import { CanManageFiles } from "$backend/rbac/permissions.ts";
import { hasPermission } from "$backend/rbac/authorizer.ts";

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const identifier: string = ctx.params.identifier ?? "";

    const userId = ctx.state.session?.getUserId()!;

    const file = await getFileData(identifier);

    if (!file) {
        throw new Deno.errors.NotFound("Requested file not found.");
    }

    if (
        !file.is_public &&
        !hasPermission(CanManageFiles.AllFiles, ctx.state) &&
        file.user_id !== userId
    ) {
        throw new Deno.errors.PermissionDenied(
            "You do not have access to this file.",
        );
    }

    const disposition = ctx.url.searchParams.has("download")
        ? "attachment"
        : "inline";

    let mimeType = file.mime_type;

    if (mimeType === "text/html") {
        mimeType = "text/plain";
    }

    return new Response(file.data, {
        headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `${disposition}; filename="${file.name}"`,
            "Content-Length": file.size.toString(),
            "Cache-Control": "public, max-age=604800, immutable", // 1 week
            "ETag": identifier,
        },
    });
};
