import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useSignal } from "@preact/signals";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Pagination from "$islands/Pagination.tsx";
import { useEffect } from "preact/hooks";
import { getUserData } from "$frontend/user-data.ts";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import EditTagForm, { EditableTag } from "$islands/tags/EditTagForm.tsx";
import Input from "$components/Input.tsx";
import { debounce } from "$frontend/deps.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteTagMessage,
    DeleteTagResponse,
    FindTagsMessage,
    FindTagsResponse,
} from "$workers/websocket/api/tags/messages.ts";

export default function TagsList() {
    const tagToDelete = useSignal<EditableTag | null>(null);
    const tagToEdit = useSignal<EditableTag | null>(null);
    const isLoading = useSignal<boolean>(true);
    const currentPage = useSignal(1);
    const totalTags = useSignal(0);
    const perPage = useSignal(20);
    const tagNameFilter = useSignal("");

    const tagList = useSignal<EditableTag[]>([]);

    const { sendMessage } = useWebsocketService();

    const loadTags = async () => {
        isLoading.value = true;

        const { records } = await sendMessage<
            FindTagsMessage,
            FindTagsResponse
        >("tags", "findTags", {
            data: {
                filters: {
                    name: tagNameFilter.value,
                },
                page: currentPage.value,
            },
            expect: "findTagsResponse",
        });

        tagList.value = records.results;
        totalTags.value = records.total;
        perPage.value = records.perPage;
        isLoading.value = false;
    };

    const handlePageChanged = (page: number) => {
        currentPage.value = page;
        loadTags();
    };

    const handleFormDone = (reason: "ok" | "cancel") => {
        tagToEdit.value = null;
        if (reason === "ok") {
            loadTags();
        }
    };

    const handleFilterChanged = debounce((value: string) => {
        tagNameFilter.value = value;
        currentPage.value = 1;
        loadTags();
    }, 500);

    const handleConfirmDelete = async () => {
        await sendMessage<DeleteTagMessage, DeleteTagResponse>(
            "tags",
            "deleteTag",
            {
                data: {
                    id: tagToDelete.value!.id!,
                },
                expect: "deleteTagResponse",
            },
        );

        tagToDelete.value = null;
        await loadTags();
    };

    useEffect(() => {
        loadTags();
    }, []);

    const user = getUserData();

    return (
        <div class="p-4">
            {user.can(CanManageTags.Create) && (
                <div class="p-4 w-full text-right">
                    <Button
                        color="success"
                        onClick={() => {
                            tagToEdit.value = {
                                id: null,
                                name: "",
                            };
                        }}
                    >
                        <Icon name="plus" /> Add
                    </Button>
                </div>
            )}
            <Input
                label="Tag name"
                labelColor="black"
                value={tagNameFilter.value}
                onInput={(value) => handleFilterChanged(value)}
            />
            {tagList.value.map((tag) => (
                <div
                    key={tag.id}
                    class="inline-block  mr-4 mt-4"
                >
                    <span
                        class="rounded-l-lg bg-gray-900 text-white p-4 cursor-pointer hover:bg-gray-700"
                        onClick={() => tagToEdit.value = tag}
                    >
                        {tag.name}
                    </span>
                    <span
                        class="rounded-r-lg bg-red-900 text-white p-4 cursor-pointer hover:bg-red-700"
                        onClick={() => tagToDelete.value = tag}
                    >
                        <Icon name="minus-circle" size="2xl" />
                    </span>
                </div>
            ))}
            {!isLoading.value && tagList.value.length === 0 && (
                <div class="text-center text-black p-4">
                    No tags available
                </div>
            )}
            {!isLoading.value && (
                <Pagination
                    total={totalTags.value}
                    perPage={perPage.value}
                    currentPage={currentPage.value}
                    onChange={handlePageChanged}
                />
            )}
            <ConfirmDialog
                visible={tagToDelete.value !== null}
                prompt="Are you sure you want to delete this tag? This action cannot be undone."
                confirmColor="danger"
                confirmText="Delete this tag"
                onConfirm={handleConfirmDelete}
                onCancel={() => tagToDelete.value = null}
            />
            <EditTagForm
                editTag={tagToEdit.value}
                onDone={handleFormDone}
            />
        </div>
    );
}
