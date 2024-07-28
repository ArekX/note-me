import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import Pagination from "$islands/Pagination.tsx";
import { useEffect } from "preact/hooks";
import { CanManageTags } from "$backend/rbac/permissions.ts";
import EditTagForm, { EditableTag } from "$islands/tags/EditTagForm.tsx";
import Input from "$components/Input.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteTagMessage,
    DeleteTagResponse,
    FindTagsMessage,
    FindTagsResponse,
} from "$workers/websocket/api/tags/messages.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import { useFilters } from "$frontend/hooks/use-filters.ts";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";

export default function TagsList() {
    const tagToDelete = useSelected<EditableTag>();
    const tagToEdit = useSelected<EditableTag>();
    const tagsLoader = useLoader();

    const { results, page, perPage, total, setPagedData, resetPage } =
        usePagedData<
            EditableTag
        >();

    const { sendMessage } = useWebsocketService();

    const loadTags = tagsLoader.wrap(async () => {
        const { records } = await sendMessage<
            FindTagsMessage,
            FindTagsResponse
        >("tags", "findTags", {
            data: {
                filters: filters.value,
                page: page.value,
            },
            expect: "findTagsResponse",
        });

        setPagedData(records);
    });

    const { filters, setFilter } = useFilters({
        initialFilters: () => ({
            name: "",
        }),
        onFilterLoad: () => {
            resetPage();
            return loadTags();
        },
    });

    const handlePageChanged = (newPage: number) => {
        page.value = newPage;
        loadTags();
    };

    const handleFormDone = (reason: "ok" | "cancel") => {
        tagToEdit.unselect();
        if (reason === "ok") {
            loadTags();
        }
    };

    const handleConfirmDelete = async () => {
        await sendMessage<DeleteTagMessage, DeleteTagResponse>(
            "tags",
            "deleteTag",
            {
                data: {
                    id: tagToDelete.selected.value!.id!,
                },
                expect: "deleteTagResponse",
            },
        );

        tagToDelete.unselect();
        await loadTags();
    };

    useEffect(() => {
        loadTags();
    }, []);

    const user = useUser();

    return (
        <div class="p-4">
            {user.can(CanManageTags.Update) && (
                <div class="p-4 w-full text-right">
                    <Button
                        color="success"
                        onClick={() => {
                            tagToEdit.select({
                                id: null,
                                name: "",
                            });
                        }}
                    >
                        <Icon name="plus" /> Add
                    </Button>
                </div>
            )}
            <Input
                label="Tag name"
                labelColor="black"
                value={filters.value.name}
                onInput={(value) => setFilter("name", value)}
            />
            {results.value.map((tag) => (
                <div
                    key={tag.id}
                    class="inline-block  mr-4 mt-4"
                >
                    <span
                        class="rounded-l-lg bg-gray-900 text-white p-4 cursor-pointer hover:bg-gray-700"
                        onClick={() => tagToEdit.select(tag)}
                    >
                        {tag.name}
                    </span>
                    <span
                        class="rounded-r-lg bg-red-900 text-white p-4 cursor-pointer hover:bg-red-700"
                        onClick={() => tagToDelete.select(tag)}
                    >
                        <Icon name="minus-circle" size="2xl" />
                    </span>
                </div>
            ))}
            {!tagsLoader.running && results.value.length === 0 && (
                <div class="text-center text-black p-4">
                    No tags available
                </div>
            )}
            {!tagsLoader.running && (
                <Pagination
                    total={total.value}
                    perPage={perPage.value}
                    currentPage={page.value}
                    onChange={handlePageChanged}
                />
            )}
            <ConfirmDialog
                visible={tagToDelete.selected.value !== null}
                prompt="Are you sure you want to delete this tag? This action cannot be undone."
                confirmColor="danger"
                confirmText="Delete this tag"
                onConfirm={handleConfirmDelete}
                onCancel={() => tagToDelete.selected.value = null}
            />
            <EditTagForm
                editTag={tagToEdit.selected.value}
                onDone={handleFormDone}
            />
        </div>
    );
}
