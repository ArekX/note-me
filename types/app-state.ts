import { SessionState } from "$backend/session/mod.ts";
import { UserRecord } from "$backend/repository/user-repository.ts";

export interface AppSessionData {
  user?: UserRecord;
  storedCsrfToken: string;
}

export interface AppState {
  session?: SessionState<AppSessionData> | null;
  newCsrfToken?: string;
}
