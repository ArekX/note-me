import BackupManagement from "../../../islands/backups/BackupManagement.tsx";
import { requirePemission } from "$backend/rbac/authorizer.ts";
import { CanManageBackups } from "$backend/rbac/permissions.ts";
import { FreshContext, page, PageProps } from "fresh";
import { AppState } from "$types";

interface BackupManagementProps {
    maxBackupCount: number;
}

export const handler = (
    ctx: FreshContext<AppState>,
) => {
    requirePemission(CanManageBackups.Update, ctx.state);

    const maxBackupCount = +(Deno.env.get("MAX_ALLOWED_BACKUP_COUNT") ?? 5);

    return page({
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
