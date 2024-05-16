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

const createTagRequest: ListenerFn<CreateTagMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    // TODO: validate the request

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
    { message: { id, data }, respond },
) => {
    // TODO: validate the request

    await updateTagRecord(id, data as UpdateTagData);

    respond<UpdateTagResponse>({
        type: "updateTagResponse",
        updatedId: id,
        updatedData: data,
    });
};

const deleteTagRequest: ListenerFn<DeleteTagMessage> = async (
    { message: { id }, respond },
) => {
    // TODO: validate the request

    await deleteTagRecord(id);

    respond<DeleteTagResponse>({
        type: "deleteTagResponse",
        deletedId: id,
    });
};

const findTagsRequest: ListenerFn<FindTagsMessage> = async (
    { message: { filters, page }, respond },
) => {
    // TODO: validate the request

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
