import BackupManagement from "../../../islands/backups/BackupManagement.tsx";
import { requirePemission } from "$backend/rbac/authorizer.ts";
import { CanManageBackups } from "$backend/rbac/permissions.ts";
import { FreshContext, PageProps } from "$fresh/server.ts";
import { AppState } from "$types";

interface BackupManagementProps {
    maxBackupCount: number;
}

export const handler = (
    _req: Request,
    ctx: FreshContext<AppState, BackupManagementProps>,
) => {
    requirePemission(CanManageBackups.Update, ctx.state);

    const maxBackupCount = +(Deno.env.get("MAX_ALLOWED_BACKUP_COUNT") ?? 5);

    return ctx.render({
        maxBackupCount,
    });
};

export default function Page(page: PageProps<BackupManagementProps>) {
    return (
        <div>
            <BackupManagement maxBackupCount={page.data.maxBackupCount} />
        </div>
    );
}
