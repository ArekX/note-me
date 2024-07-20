import { SessionState } from "$backend/session/mod.ts";
import { UserLoginRecord } from "$backend/repository/user-repository.ts";
import { AppPermissions } from "$backend/rbac/permissions.ts";

export interface AppSessionData {
    user?: UserLoginRecord;
    storedCsrfToken: string;
}

export interface AppState {
    session?: SessionState<AppSessionData> | null;
    permissions?: AppPermissions[];
    newCsrfToken?: string;
}
