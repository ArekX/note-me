import { defineStore } from "pinia";
import type {
    CreateTagMessage,
    CreateTagResponse,
    DeleteTagMessage,
    DeleteTagResponse,
    FindTagsMessage,
    FindTagsResponse,
    UpdateTagMessage,
    UpdateTagResponse,
} from "@/types/messages";
import { useSocketStore } from "./socket";

export const useTagsStore = defineStore("tags", () => {
    const service = () => useSocketStore().getService();

    const find = async (name: string, page = 1) =>
        (
            await (
                await service()
            ).sendMessage<FindTagsMessage, FindTagsResponse>(
                "tags",
                "findTags",
                {
                    data: { filters: { name }, page },
                    expect: "findTagsResponse",
                },
            )
        ).records;

    const create = async (name: string) =>
        (
            await (
                await service()
            ).sendMessage<CreateTagMessage, CreateTagResponse>(
                "tags",
                "createTag",
                { data: { data: { name } }, expect: "createTagResponse" },
            )
        ).record;

    const update = async (id: number, name: string) =>
        (await service()).sendMessage<UpdateTagMessage, UpdateTagResponse>(
            "tags",
            "updateTag",
            { data: { id, data: { name } }, expect: "updateTagResponse" },
        );

    const remove = async (id: number) =>
        (await service()).sendMessage<DeleteTagMessage, DeleteTagResponse>(
            "tags",
            "deleteTag",
            { data: { id }, expect: "deleteTagResponse" },
        );

    return { find, create, update, remove };
});
