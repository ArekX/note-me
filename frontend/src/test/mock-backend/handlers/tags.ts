import type {
    CreateTagResponse,
    DeleteTagResponse,
    FindTagsResponse,
    TagFrontendMessage,
    UpdateTagResponse,
} from "@/types/messages";
import {
    contains,
    missingPermission,
    nextId,
    paged,
    type MockHandlerMap,
} from "../handler";
import { CanManageTags } from "@/lib/rbac";

export const tagsHandlers: MockHandlerMap<TagFrontendMessage> = {
    findTags: ({ filters, page }, { state, respond }) =>
        respond<FindTagsResponse>("findTagsResponse", {
            records: paged(
                state.tags.filter((t) => contains(t.name, filters.name)),
                page,
            ),
        }),
    createTag: ({ data }, { state, respond }) => {
        const record = { id: nextId(state), name: data.name };
        state.tags.push(record);
        respond<CreateTagResponse>("createTagResponse", { record });
    },
    updateTag: ({ id, data }, { state, respond, fail }) => {
        if (data.name !== undefined && data.name.length === 0) {
            return fail(
                '[{"code":"too_small","path":["name"],"message":"Name must have at least one character"}]',
            );
        }
        const denied = missingPermission(state, CanManageTags.Update);
        if (denied) {
            return fail(denied);
        }
        const tag = state.tags.find((t) => t.id === id);
        if (!tag) {
            return fail("Tag not found.");
        }
        if (data.name !== undefined) {
            const oldName = tag.name;
            state.notes.forEach((n) => {
                n.tags = n.tags.map((t) => (t === oldName ? data.name! : t));
            });
            tag.name = data.name;
        }
        respond<UpdateTagResponse>("updateTagResponse", {
            updated_id: id,
            updated_data: data,
        });
    },
    deleteTag: ({ id }, { state, respond, fail }) => {
        const denied = missingPermission(state, CanManageTags.Update);
        if (denied) {
            return fail(denied);
        }
        const name = state.tags.find((t) => t.id === id)?.name;
        state.notes.forEach((n) => {
            n.tags = n.tags.filter((t) => t !== name);
        });
        state.tags = state.tags.filter((t) => t.id !== id);
        respond<DeleteTagResponse>("deleteTagResponse", { deleted_id: id });
    },
};
