import {
    RepositoryHandlerMap,
    RepositoryRequest,
} from "$workers/database/message.ts";
import {
    CreateTagData,
    createTagRecord,
    deleteTagRecord,
    FindTagFilters,
    findTags,
    linkNoteWithTags,
    resolveTags,
    TagRecord,
    UpdateTagData,
    updateTagRecord,
} from "$backend/repository/note-tags-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

type NoteTagsRequest<Key extends string, Request, Response> = RepositoryRequest<
    "noteTags",
    Key,
    Request,
    Response
>;

type ResolveTags = NoteTagsRequest<
    "resolveTags",
    { user_id: number; tags: string[] },
    TagRecord[]
>;
type LinkNoteWithTags = NoteTagsRequest<
    "linkNoteWithTags",
    { note_id: number; user_id: number; tags: string[] },
    boolean
>;
type FindTags = NoteTagsRequest<
    "findTags",
    { filters: FindTagFilters; page: number },
    Paged<TagRecord>
>;
type CreateTagRecord = NoteTagsRequest<
    "createTagRecord",
    { data: CreateTagData; user_id: number },
    TagRecord
>;
type UpdateTagRecord = NoteTagsRequest<
    "updateTagRecord",
    { id: number; data: UpdateTagData },
    boolean
>;
type DeleteTagRecord = NoteTagsRequest<"deleteTagRecord", number, boolean>;

export type NoteTagsRepository =
    | ResolveTags
    | LinkNoteWithTags
    | FindTags
    | CreateTagRecord
    | UpdateTagRecord
    | DeleteTagRecord;

export const noteTags: RepositoryHandlerMap<NoteTagsRepository> = {
    resolveTags: ({ user_id, tags }) => resolveTags(user_id, tags),
    linkNoteWithTags: ({ note_id, user_id, tags }) =>
        linkNoteWithTags(note_id, user_id, tags),
    findTags: ({ filters, page }) => findTags(filters, page),
    createTagRecord: ({ data, user_id }) => createTagRecord(data, user_id),
    updateTagRecord: ({ id, data }) => updateTagRecord(id, data),
    deleteTagRecord,
};
