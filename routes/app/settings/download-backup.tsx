import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { requirePemission } from "$backend/rbac/authorizer.ts";
import { CanManageBackups } from "$backend/rbac/permissions.ts";
import { getBackupFile } from "$backend/backups.ts";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { backupNameSchema } from "$schemas/settings.ts";

export const handler = async (req: Request, ctx: FreshContext<AppState>) => {
    requirePemission(CanManageBackups.Update, ctx.state);

    const params = parseQueryParams<{ name: string }>(req.url, {
        name: { type: "string" },
    });

    await requireValidSchema(backupNameSchema, params);

    const backupFile = await getBackupFile(params.name);

    if (!backupFile) {
        throw new Deno.errors.NotFound("Requested backup not found.");
    }

    return new Response(backupFile.file.readable, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${params.name}"`,
            "Content-Length": backupFile.size.toString(),
            "Cache-Control": "no-cache",
        },
    });
};
