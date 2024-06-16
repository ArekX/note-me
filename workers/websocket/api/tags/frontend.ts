import { ListenerFn, RegisterListenerMap } from "$workers/websocket/types.ts";

import {
    CreateTagResponse,
    DeleteTagMessage,
    DeleteTagResponse,
    FindTagsMessage,
    FindTagsResponse,
    TagFrontendMessage,
    UpdateTagMessage,
    UpdateTagResponse,
} from "./messages.ts";
import { CreateTagMessage } from "$workers/websocket/api/tags/messages.ts";
import {
    CreateTagData,
    createTagRecord,
    deleteTagRecord,
    findTags,
    UpdateTagData,
    updateTagRecord,
} from "$backend/repository/note-tags-repository.ts";
import { requireValidSchema } from "$schemas/mod.ts";
import { addTagSchema, updateTagSchema } from "$schemas/tags.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";

const createTagRequest: ListenerFn<CreateTagMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    await requireValidSchema(addTagSchema, data);

    const record = await createTagRecord(
        data as CreateTagData,
        sourceClient?.userId!,
    );

    respond<CreateTagResponse>({
        type: "createTagResponse",
        record,
    });
};

const updateTagRequest: ListenerFn<UpdateTagMessage> = async (
    { message: { id, data }, respond, sourceClient },
) => {
    await requireValidSchema(updateTagSchema, data);
    sourceClient!.auth.require(CanManageTags.Update);

    await updateTagRecord(id, data as UpdateTagData);

    respond<UpdateTagResponse>({
        type: "updateTagResponse",
        updatedId: id,
        updatedData: data,
    });
};

const deleteTagRequest: ListenerFn<DeleteTagMessage> = async (
    { message: { id }, respond, sourceClient },
) => {
    await deleteTagRecord(id);
    sourceClient!.auth.require(CanManageTags.Delete);

    respond<DeleteTagResponse>({
        type: "deleteTagResponse",
        deletedId: id,
    });
};

const findTagsRequest: ListenerFn<FindTagsMessage> = async (
    { message: { filters, page }, respond },
) => {
    const records = await findTags(filters, page);

    respond<FindTagsResponse>({
        type: "findTagsResponse",
        records,
    });
};

export const frontendMap: RegisterListenerMap<TagFrontendMessage> = {
    createTag: createTagRequest,
    updateTag: updateTagRequest,
    deleteTag: deleteTagRequest,
    findTags: findTagsRequest,
};
