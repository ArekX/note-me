import { defineStore } from "pinia";
import type {
    GetSingleGroupMessage,
    GetSingleGroupResponse,
    GetTreeMessage,
    GetTreeResponse,
} from "@/types/messages";
import { useSocketStore } from "./socket";

export const useGroupsStore = defineStore("groups", () => {
    const service = () => useSocketStore().getService();

    const findGroups = async (parentId?: number) =>
        (
            await (
                await service()
            ).sendMessage<GetTreeMessage, GetTreeResponse>("tree", "getTree", {
                data:
                    parentId === undefined
                        ? { item_type: "group" }
                        : { parent_id: parentId, item_type: "group" },
                expect: "getTreeResponse",
            })
        ).records;

    const getGroup = async (id: number) =>
        (
            await (
                await service()
            ).sendMessage<GetSingleGroupMessage, GetSingleGroupResponse>(
                "groups",
                "getSingleGroup",
                { data: { id }, expect: "getSingleGroupResponse" },
            )
        ).record;

    return { findGroups, getGroup };
});
