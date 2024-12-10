import { backupTarget } from "$workers/database/repository/backup-target.ts";
import { user } from "$workers/database/repository/user.ts";
import { group } from "$workers/database/repository/group.ts";
import { file } from "$workers/database/repository/file.ts";
import { noteHistory } from "$workers/database/repository/note-history.ts";
import { noteReminder } from "$workers/database/repository/note-reminder.ts";
import { note } from "$workers/database/repository/note.ts";
import { noteSearch } from "$workers/database/repository/note-search.ts";
import { noteShare } from "$workers/database/repository/note-share.ts";
import { noteTags } from "$workers/database/repository/note-tags.ts";
import { notification } from "$workers/database/repository/notification.ts";
import { passkey } from "$workers/database/repository/passkey.ts";
import { periodicTask } from "$workers/database/repository/periodic-task.ts";
import { treeList } from "$workers/database/repository/tree-list.ts";
import { session } from "$workers/database/repository/session.ts";

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
