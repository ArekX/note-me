import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { CanManageFiles } from "$backend/rbac/permissions.ts";
import { hasPermission } from "$backend/rbac/authorizer.ts";
import { repository } from "$db";
import { decodeBase64 } from "$std/encoding/base64.ts";

const ALLOWED_RENDER_MIME_TYPES = [
    "text/plain",
    "application/json",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/x-icon",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "video/mp4",
    "video/ogg",
    "video/webm",
];

export const handler = async (_req: Request, ctx: FreshContext<AppState>) => {
    const identifier: string = ctx.params.identifier ?? "";

    const userId = ctx.state.session?.getUserId()!;

    const file = await repository.file.getFileData(identifier);

    if (!file) {
        throw new Deno.errors.NotFound("Requested file not found.");
    }

    if (
        !file.is_public &&
        file.user_id !== userId &&
        !hasPermission(CanManageFiles.AllFiles, ctx.state)
    ) {
        throw new Deno.errors.PermissionDenied(
            "You do not have access to this file.",
        );
    }

    let disposition = ctx.url.searchParams.has("download")
        ? "attachment"
        : "inline";

    let mimeType = file.mime_type;

    if (mimeType.startsWith("text/")) {
        mimeType = "text/plain";
    }

    if (!ALLOWED_RENDER_MIME_TYPES.includes(mimeType)) {
        disposition = "attachment";
    }

    const byteData = decodeBase64(file.data);

    return new Response(byteData, {
        headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `${disposition}; filename="${file.name}"`,
            "Content-Length": file.size.toString(),
            "Cache-Control": "public, max-age=604800, immutable", // 1 week
            "ETag": identifier,
        },
    });
};
