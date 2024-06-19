import { Message } from "$workers/websocket/types.ts";
import { AddTagRequest, UpdateTagRequest } from "$schemas/tags.ts";
import {
    FindTagFilters,
    TagRecord,
} from "$backend/repository/note-tags-repository.ts";
import { Paged } from "$lib/kysely-sqlite-dialect/pagination.ts";

type TagMessage<Type, Data = unknown> = Message<
    "tags",
    Type,
    Data
>;

export type CreateTagMessage = TagMessage<
    "createTag",
    { data: AddTagRequest }
>;

export type CreateTagResponse = TagMessage<
    "createTagResponse",
    { record: TagRecord }
>;

export type UpdateTagMessage = TagMessage<
    "updateTag",
    { id: number; data: UpdateTagRequest }
>;

export type UpdateTagResponse = TagMessage<
    "updateTagResponse",
    { updated_id: number; updated_data: UpdateTagRequest }
>;

export type DeleteTagMessage = TagMessage<
    "deleteTag",
    { id: number }
>;

export type DeleteTagResponse = TagMessage<
    "deleteTagResponse",
    { deleted_id: number }
>;

export type FindTagsMessage = TagMessage<
    "findTags",
    { filters: FindTagFilters; page: number }
>;

export type FindTagsResponse = TagMessage<
    "findTagsResponse",
    {
        records: Paged<TagRecord>;
    }
>;

export type TagFrontendResponse =
    | CreateTagResponse
    | UpdateTagResponse
    | DeleteTagResponse
    | FindTagsResponse;

export type TagFrontendMessage =
    | CreateTagMessage
    | UpdateTagMessage
    | DeleteTagMessage
    | FindTagsMessage;
