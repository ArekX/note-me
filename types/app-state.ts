import { SessionState } from "$backend/session/mod.ts";
import { UserRecord } from "$repository";

export interface AppSessionData {
  user?: UserRecord;
}

export interface AppState {
  session?: SessionState<AppSessionData> | null;
}
