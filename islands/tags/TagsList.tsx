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
import Loader from "$islands/Loader.tsx";

export default function TagsList() {
    const tagToDelete = useSelected<EditableTag>();
    const tagToEdit = useSelected<EditableTag>();
    const tagsLoader = useLoader(true);

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
        <div class="p-4 text-white">
            {user.can(CanManageTags.Update) && (
                <div class="py-4 w-full text-right">
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

            <div class="py-4">
                This screen allows you to make changes to tags. Click on the tag
                name to edit it, or click on the minus icon to delete it.
                Deleted tags will be removed from all notes.
            </div>

            <Input
                label="Tag name"
                labelColor="white"
                placeholder="Search tags"
                value={filters.value.name}
                onInput={(value) => setFilter("name", value)}
            />
            <div class="py-5">
                {tagsLoader.running && (
                    <div class="text-center">
                        <Loader />
                    </div>
                )}
                <div class="flex flex-wrap">
                    {results.value.map((tag) => (
                        <div
                            key={tag.id}
                            class="max-md:w-full mr-4 mt-4"
                        >
                            <span class="flex w-full">
                                <span
                                    class="rounded-l-lg bg-gray-900 text-white px-6 py-2 border-b-0 cursor-pointer hover:bg-gray-700 border-gray-700 border border-r-0 overflow-hidden text-ellipsis"
                                    onClick={() => tagToEdit.select(tag)}
                                >
                                    {tag.name}
                                </span>
                                <span
                                    class="rounded-r-lg bg-red-900/90 text-white p-2 border-b-0 cursor-pointer hover:bg-red-700 border border-red-700/40 border-l-0"
                                    onClick={() => tagToDelete.select(tag)}
                                >
                                    <Icon name="minus-circle" size="xl" />
                                </span>
                            </span>
                        </div>
                    ))}
                    {!tagsLoader.running && results.value.length === 0 && (
                        <div class="text-center p-4">
                            No tags available
                        </div>
                    )}
                </div>
                {!tagsLoader.running && (
                    <div class="pt-5">
                        <Pagination
                            total={total.value}
                            perPage={perPage.value}
                            currentPage={page.value}
                            onChange={handlePageChanged}
                        />
                    </div>
                )}
            </div>
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
