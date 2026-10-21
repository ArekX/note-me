import { computed, onMounted, ref } from "vue";
import { useDataChanges } from "./useDataChanges";
import { useFileUploader } from "./useFileUploader";
import { useFilters } from "./useFilters";
import { useLoader } from "./useLoader";
import { usePagedData } from "./usePagedData";
import type { FileKind } from "@/lib/file-kind";
import { useFilesStore } from "@/stores/files";
import { useToastStore } from "@/stores/toast";
import type { FileMetaRecord } from "@/types/records";

export interface FileListFilters {
    name: string;
    owner: string;
    kind: FileKind | "";
    visibility: "public" | "private" | "";
}

const emptyFilters = (): FileListFilters => ({
    name: "",
    owner: "",
    kind: "",
    visibility: "",
});

export const useFileList = (
    adminMode: () => boolean,
    initialKind: FileListFilters["kind"] = "",
) => {
    const filesStore = useFilesStore();
    const toastStore = useToastStore();
    const uploader = useFileUploader();
    const loader = useLoader(true);
    const files = usePagedData<FileMetaRecord>(() => load());
    const processing = ref(new Set<string>());
    const fileToDelete = ref<FileMetaRecord | null>(null);

    const { reportError } = toastStore;

    const load = loader.wrap(async () => {
        const { name, owner, kind, visibility } = filters.value;
        try {
            files.setPagedData(
                await filesStore.find(
                    {
                        name,
                        allFiles: adminMode(),
                        owner: adminMode() && owner ? owner : undefined,
                        kind: kind || undefined,
                        visibility: visibility || undefined,
                    },
                    files.page.value,
                ),
            );
        } catch (error) {
            reportError(error);
        }
    });

    const initialFilters = (): FileListFilters => ({
        ...emptyFilters(),
        kind: initialKind,
    });

    const { filters, setFilter, resetFilters } = useFilters({
        initialFilters,
        onFilterLoad: () => files.loadFirstPage(),
    });

    const hasFilters = computed(() => {
        const initial = initialFilters();
        return (Object.keys(initial) as (keyof FileListFilters)[]).some(
            (key) => filters.value[key] !== initial[key],
        );
    });

    const upload = async (selected: File[]) => {
        await uploader.uploadFiles(selected);
        await load();
    };

    const setProcessing = (identifier: string, value: boolean) => {
        const next = new Set(processing.value);
        if (value) {
            next.add(identifier);
        } else {
            next.delete(identifier);
        }
        processing.value = next;
    };

    const toggleVisibility = async (file: FileMetaRecord) => {
        setProcessing(file.identifier, true);
        try {
            await filesStore.setPublic(file.identifier, !file.is_public);
            file.is_public = !file.is_public;
            toastStore.addMessage({
                type: "info",
                text: `File '${file.name}' can now ${file.is_public ? "be seen by everyone" : "only be seen by you"}.`,
            });
        } catch (error) {
            reportError(error);
        } finally {
            setProcessing(file.identifier, false);
        }
    };

    const confirmDelete = async (
        onDeleted?: (file: FileMetaRecord) => void,
    ) => {
        const file = fileToDelete.value!;
        fileToDelete.value = null;
        setProcessing(file.identifier, true);
        try {
            await filesStore.remove(file.identifier);
            onDeleted?.(file);
            if (files.results.value.length === 1 && files.page.value > 1) {
                files.setPagedData({ page: files.page.value - 1 });
            }
            await load();
        } catch (error) {
            reportError(error);
        } finally {
            setProcessing(file.identifier, false);
        }
    };

    const forEachFile = async (
        selected: FileMetaRecord[],
        action: (file: FileMetaRecord) => Promise<unknown>,
    ) => {
        for (const file of selected) {
            setProcessing(file.identifier, true);
        }
        const results = await Promise.allSettled(
            selected.map(async (file) => {
                try {
                    await action(file);
                } finally {
                    setProcessing(file.identifier, false);
                }
            }),
        );
        const failed = results.filter(
            (result): result is PromiseRejectedResult =>
                result.status === "rejected",
        );
        if (failed.length > 0) {
            reportError(
                failed[0]!.reason,
                `${failed.length} of ${selected.length} files failed: `,
            );
        }
        return selected.length - failed.length;
    };

    const plural = (count: number) =>
        count === 1 ? "1 file" : `${count} files`;

    const setManyVisibility = async (
        selected: FileMetaRecord[],
        isPublic: boolean,
    ) => {
        const changed = await forEachFile(selected, async (file) => {
            await filesStore.setPublic(file.identifier, isPublic);
            file.is_public = isPublic;
        });
        if (changed > 0) {
            toastStore.addMessage({
                type: "info",
                text: `${plural(changed)} made ${isPublic ? "public" : "private"}.`,
            });
        }
    };

    const removeMany = async (selected: FileMetaRecord[]) => {
        const removed = await forEachFile(selected, (file) =>
            filesStore.remove(file.identifier),
        );
        if (removed > 0) {
            toastStore.addMessage({
                type: "info",
                text: `${plural(removed)} deleted.`,
            });
        }
        if (removed === files.results.value.length && files.page.value > 1) {
            files.setPagedData({ page: files.page.value - 1 });
        }
        await load();
    };

    useDataChanges(["file"], load, { skipOwnRequests: true });
    onMounted(load);

    return {
        uploader,
        loader,
        files,
        processing,
        fileToDelete,
        filters,
        hasFilters,
        setFilter,
        resetFilters,
        changePage: files.changePage,
        upload,
        toggleVisibility,
        confirmDelete,
        setManyVisibility,
        removeMany,
    };
};
