import {
    backupTarget,
    BackupTargetRepository,
} from "$workers/database/repository/backup-target.ts";
import { user, UserRepository } from "$workers/database/repository/user.ts";
import { group, GroupRepository } from "$workers/database/repository/group.ts";
import { file, FileRepository } from "$workers/database/repository/file.ts";
import {
    noteHistory,
    NoteHistoryRepository,
} from "$workers/database/repository/note-history.ts";
import {
    noteReminder,
    NoteReminderRepository,
} from "$workers/database/repository/note-reminder.ts";
import { note, NoteRepository } from "$workers/database/repository/note.ts";
import {
    noteSearch,
    NoteSearchRepository,
} from "$workers/database/repository/note-search.ts";
import {
    noteShare,
    NoteShareRepository,
} from "$workers/database/repository/note-share.ts";
import {
    noteTags,
    NoteTagsRepository,
} from "$workers/database/repository/note-tags.ts";
import {
    notification,
    NotificationRepository,
} from "$workers/database/repository/notification.ts";
import {
    passkey,
    PasskeyRepository,
} from "$workers/database/repository/passkey.ts";
import {
    periodicTask,
    PeriodicTaskRepository,
} from "$workers/database/repository/periodic-task.ts";
import {
    treeList,
    TreeListRepository,
} from "$workers/database/repository/tree-list.ts";
import {
    session,
    SessionRepository,
} from "$workers/database/repository/session.ts";

export type RepositoryData =
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

export const repositories = {
    backupTarget,
    user,
    group,
    file,
    noteHistory,
    noteReminder,
    note,
    noteSearch,
    noteShare,
    noteTags,
    notification,
    passkey,
    periodicTask,
    treeList,
    session,
};
