import { Generated } from "$lib/kysely-sqlite-dialect/deps.ts";

export interface User {
  id: Generated<number>;
  username: string;
  password: string;
  created_at: Date;
}

export interface Note {
  id: Generated<number>;
  note: string;
  user_id: number;
  created_at: Date;
}

export interface Tables {
  user: User;
  note: Note;
}
