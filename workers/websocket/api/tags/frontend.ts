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
import { requireValidSchema } from "$schemas/mod.ts";
import { addTagSchema, updateTagSchema } from "$schemas/tags.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import { repository } from "$workers/database/lib.ts";

const handleCreateTagRequest: ListenerFn<CreateTagMessage> = async (
    { message: { data }, sourceClient, respond },
) => {
    await requireValidSchema(addTagSchema, data);

    const record = await repository.noteTags.createTagRecord({
        data,
        user_id: sourceClient!.userId!,
    });

    respond<CreateTagResponse>({
        type: "createTagResponse",
        record,
    });
};

const handleUpdateTagRequest: ListenerFn<UpdateTagMessage> = async (
    { message: { id, data }, respond, sourceClient },
) => {
    await requireValidSchema(updateTagSchema, data);
    sourceClient!.auth.require(CanManageTags.Update);

    if (data.name) {
        await repository.noteTags.updateTagRecord({
            id,
            data: { name: data.name },
        });
    }

    respond<UpdateTagResponse>({
        type: "updateTagResponse",
        updated_id: id,
        updated_data: data,
    });
};

const handleDeleteTagRequest: ListenerFn<DeleteTagMessage> = async (
    { message: { id }, respond, sourceClient },
) => {
    await repository.noteTags.deleteTagRecord(id);
    sourceClient!.auth.require(CanManageTags.Update);

    respond<DeleteTagResponse>({
        type: "deleteTagResponse",
        deleted_id: id,
    });
};

const handleFindTagsRequest: ListenerFn<FindTagsMessage> = async (
    { message: { filters, page }, respond },
) => {
    const records = await repository.noteTags.findTags({ filters, page });

    respond<FindTagsResponse>({
        type: "findTagsResponse",
        records,
    });
};

export const frontendMap: RegisterListenerMap<TagFrontendMessage> = {
    createTag: handleCreateTagRequest,
    updateTag: handleUpdateTagRequest,
    deleteTag: handleDeleteTagRequest,
    findTags: handleFindTagsRequest,
};
