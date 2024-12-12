import { SessionState } from "$backend/session/mod.ts";
import { UserLoginRecord } from "../workers/database/query/user-repository.ts";
import { AppPermissions } from "$backend/rbac/permissions.ts";
import { PublicKeyCredentialCreationOptionsJSON } from "$backend/deps.ts";

export interface AppSessionData {
    user?: UserLoginRecord;
    storedCsrfToken: string;
    registerPasskeyOptions?: PublicKeyCredentialCreationOptionsJSON;
}

export interface AppState {
    session?: SessionState<AppSessionData> | null;
    permissions?: AppPermissions[];
    newCsrfToken?: string;
}
