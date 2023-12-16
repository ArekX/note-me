import { SessionState } from "$backend/session/mod.ts";
import { User } from "$backend/user/user.ts";

export interface AppSessionData {
  user?: User;
}

export interface AppState {
  session?: SessionState<AppSessionData> | null;
}
