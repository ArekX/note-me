export interface UserState {
  username: string;
  displayName: string;
}

export interface AppState {
  user?: UserState;
}
