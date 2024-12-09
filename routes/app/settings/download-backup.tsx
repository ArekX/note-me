import { FreshContext } from "$fresh/server.ts";
import { AppState } from "$types";
import { requirePemission } from "$backend/rbac/authorizer.ts";
import { CanManageBackups } from "$backend/rbac/permissions.ts";
import { parseQueryParams } from "$backend/parse-query-params.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { backupNameSchema } from "$schemas/settings.ts";
import { createBackupHandler } from "$lib/backup-handler/mod.ts";
import { db } from "$workers/database/lib.ts";

export const handler = async (req: Request, ctx: FreshContext<AppState>) => {
    requirePemission(CanManageBackups.Update, ctx.state);

    const params = parseQueryParams<{ identifier: string; target_id: number }>(
        req.url,
        {
            identifier: { type: "string" },
            target_id: { type: "number" },
        },
    );

    await requireValidSchema(backupNameSchema, { name: params.identifier });

    const target = await db.backupTarget.getBackupTarget(params.target_id);

    if (!target) {
        throw new Error("Backup target not found");
    }

    const handler = createBackupHandler(target.type, target.settings);

    const streamData = await handler.getBackupStream(params.identifier);

    return new Response(streamData.stream, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition":
                `attachment; filename="${params.identifier}"`,
            "Content-Length": streamData.size.toString(),
            "Cache-Control": "no-cache",
        },
    });
};
