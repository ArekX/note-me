import { Generated } from "$lib/kysely-sqlite-dialect/deps.ts";

export interface UserTable {
  id: Generated<number>;
  name: string;
  username: string;
  password: string;
  created_at: number;
  updated_at: number;
}

export interface NoteTable {
  id: Generated<number>;
  note: string;
  user_id: number;
  created_at: number;
  updated_at: number;
}

export interface SessionTable {
  id: Generated<number>;
  key: string;
  data: string;
  expires_at: number;
}

export interface NotificationTable {
  id: Generated<number>;
  data: string;
  created_at: number;
  is_read: boolean;
  is_deleted: boolean;
  user_id: number;
}

export interface Tables {
  user: UserTable;
  note: NoteTable;
  session: SessionTable;
  notification: NotificationTable;
}
