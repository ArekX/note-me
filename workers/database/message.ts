import { BackupTargetRepository } from "$workers/database/repository/backup-target.ts";
import { UserRepository } from "$workers/database/repository/user.ts";
import { GroupRepository } from "$workers/database/repository/group.ts";
import { FileRepository } from "$workers/database/repository/file.ts";
import { NoteHistoryRepository } from "$workers/database/repository/note-history.ts";
import { NoteReminderRepository } from "$workers/database/repository/note-reminder.ts";
import { NoteRepository } from "$workers/database/repository/note.ts";
import { NoteSearchRepository } from "$workers/database/repository/note-search.ts";
import { NoteShareRepository } from "$workers/database/repository/note-share.ts";
import { NoteTagsRepository } from "$workers/database/repository/note-tags.ts";
import { NotificationRepository } from "$workers/database/repository/notification.ts";
import { PasskeyRepository } from "$workers/database/repository/passkey.ts";
import { PeriodicTaskRepository } from "$workers/database/repository/periodic-task.ts";
import { TreeListRepository } from "$workers/database/repository/tree-list.ts";
import { SessionRepository } from "$workers/database/repository/session.ts";

export interface RepositoryRequest<
    T extends string = string,
    Key extends string = string,
    Data = unknown,
    Response = unknown,
> {
    name: T;
    key: Key;
    data: Data;
    response: Response;
}

export type RepositoryHandlerMap<T extends RepositoryRequest> = {
    [K in T["key"]]: (
        data: Extract<T, { key: K }>["data"],
    ) => Promise<Extract<T, { key: K }>["response"]>;
};

export type DatabaseData =
    | BackupTargetRepository
    | UserRepository
    | GroupRepository
    | FileRepository
    | NoteHistoryRepository
    | NoteReminderRepository
    | NoteRepository
    | NoteSearchRepository
    | NoteShareRepository
    | NoteTagsRepository
    | NotificationRepository
    | PasskeyRepository
    | PeriodicTaskRepository
    | TreeListRepository
    | SessionRepository;
