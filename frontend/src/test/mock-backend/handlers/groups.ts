import type {
    CreateGroupResponse,
    DeleteGroupProgress,
    DeleteGroupResponse,
    DeleteNoteResponse,
    GetSingleGroupResponse,
    GroupFrontendMessage,
    UpdateGroupResponse,
} from "@/types/messages";
import type { MockState } from "../state";
import { nextId, type MockHandlerMap } from "../handler";
import { now } from "../state";

const groupExists = (state: MockState, id: number | null) =>
    id === null || state.groups.some((g) => g.id === id);

const isWithin = (state: MockState, id: number, ancestorId: number) => {
    for (
        let at: number | null = id;
        at !== null;
        at = state.groups.find((g) => g.id === at)?.parent_id ?? null
    ) {
        if (at === ancestorId) {
            return true;
        }
    }
    return false;
};

const withFlags = (state: MockState, id: number) => {
    const group = state.groups.find((g) => g.id === id);
    return group
        ? {
              ...group,
              has_subgroups: state.groups.some((g) => g.parent_id === id)
                  ? 1
                  : null,
              has_notes: state.notes.some((n) => n.group_id === id) ? 1 : null,
          }
        : null;
};

export const groupsHandlers: MockHandlerMap<GroupFrontendMessage> = {
    createGroup: ({ data }, { state, respond, fail }) => {
        if (!groupExists(state, data.parent_id)) {
            return fail("Group does not exist!");
        }
        const record = {
            id: nextId(state),
            name: data.name,
            parent_id: data.parent_id,
            created_at: now(),
            has_subgroups: null,
            has_notes: null,
        };
        state.groups.push(record);
        respond<CreateGroupResponse>("createGroupResponse", { record });
    },
    updateGroup: ({ id, data }, { state, respond, fail }) => {
        const group = state.groups.find((g) => g.id === id);
        if (!group) {
            return fail("Group does not exist!");
        }
        if (data.parent_id !== undefined && data.parent_id !== null) {
            if (data.parent_id === id) {
                return fail("Group cannot be its own parent");
            }
            if (!groupExists(state, data.parent_id)) {
                return fail("Group does not exist!");
            }
            if (isWithin(state, data.parent_id, id)) {
                return fail("Group cannot be moved into its own subgroup");
            }
        }
        if (data.name !== undefined) group.name = data.name;
        if (data.parent_id !== undefined) group.parent_id = data.parent_id;
        respond<UpdateGroupResponse>("updateGroupResponse", {
            updated_id: id,
            updated_data: data,
        });
    },
    deleteGroup: ({ id }, { state, respond, push, fail }) => {
        if (!state.groups.some((g) => g.id === id)) {
            return fail("Group does not exist!");
        }

        let deletedCount = 0;
        const pending = [id];

        while (pending.length > 0) {
            const parentId = pending.shift()!;
            const groupIds = state.groups
                .filter((g) => g.parent_id === parentId)
                .map((g) => g.id);
            const notes = state.notes.filter(
                (n) => n.group_id === parentId && !n.is_deleted,
            );

            for (const note of notes) {
                note.is_deleted = true;
                note.deleted_at = now();
                push<DeleteNoteResponse>("notes", "deleteNoteResponse", {
                    deleted_id: note.id,
                });
            }
            state.groups = state.groups.filter((g) => !groupIds.includes(g.id));
            for (const groupId of groupIds) {
                push<DeleteGroupResponse>("groups", "deleteGroupResponse", {
                    deleted_id: groupId,
                });
            }

            deletedCount += groupIds.length + notes.length;
            push<DeleteGroupProgress>("groups", "deleteGroupProgress", {
                deleted_id: id,
                deleted_count: deletedCount,
            });
            pending.push(...groupIds);
        }

        state.groups = state.groups.filter((g) => g.id !== id);
        respond<DeleteGroupResponse>("deleteGroupResponse", { deleted_id: id });
    },
    getSingleGroup: ({ id }, { state, respond }) =>
        respond<GetSingleGroupResponse>("getSingleGroupResponse", {
            record: withFlags(state, id),
        }),
};
