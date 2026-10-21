import type { GetTreeResponse, TreeFrontendMessage } from "@/types/messages";
import type { TreeRecord } from "@/types/records";
import type { MockHandlerMap } from "../handler";

export const treeHandlers: MockHandlerMap<TreeFrontendMessage> = {
    getTree: ({ parent_id, item_type }, { state, respond }) => {
        const parent = parent_id ?? null;
        const records: TreeRecord[] = [];

        if (item_type !== "note") {
            for (const group of state.groups.filter(
                (g) => g.parent_id === parent,
            )) {
                records.push({
                    type: "group",
                    id: group.id,
                    name: group.name,
                    is_encrypted: 0,
                    has_children:
                        state.groups.some((g) => g.parent_id === group.id) ||
                        state.notes.some(
                            (n) => n.group_id === group.id && !n.is_deleted,
                        )
                            ? 1
                            : 0,
                });
            }
        }

        if (item_type !== "group") {
            for (const note of state.notes.filter(
                (n) =>
                    n.user_id === state.currentUser.id &&
                    n.group_id === parent &&
                    !n.is_deleted,
            )) {
                records.push({
                    type: "note",
                    id: note.id,
                    name: note.title,
                    is_encrypted: note.is_encrypted ? 1 : 0,
                    has_children: 0,
                });
            }
        }

        respond<GetTreeResponse>("getTreeResponse", { records, parent_id });
    },
};
