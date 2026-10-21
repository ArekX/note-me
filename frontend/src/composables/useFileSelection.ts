import { computed, ref, watch, type Ref } from "vue";
import type { FileMetaRecord } from "@/types/records";

// Click picks one file and Ctrl+click adds or removes one, in the grid and
// in the list alike. The picker keeps files picked on other pages; the file
// manager only acts on the page it shows.
export const useFileSelection = (
    pageFiles: Ref<FileMetaRecord[]>,
    { keepOtherPages }: { keepOtherPages: boolean },
) => {
    const selected = ref(new Map<string, FileMetaRecord>());

    const selectedFiles = computed(() => [...selected.value.values()]);
    const selectedIds = computed(() => new Set(selected.value.keys()));
    const allSelected = computed(
        () =>
            pageFiles.value.length > 0 &&
            pageFiles.value.every((file) =>
                selected.value.has(file.identifier),
            ),
    );

    const set = (files: FileMetaRecord[]) => {
        selected.value = new Map(files.map((file) => [file.identifier, file]));
    };

    const toggle = (file: FileMetaRecord) =>
        set(
            selected.value.has(file.identifier)
                ? selectedFiles.value.filter(
                      (other) => other.identifier !== file.identifier,
                  )
                : [...selectedFiles.value, file],
        );

    const pick = (file: FileMetaRecord, multiple: boolean) =>
        multiple ? toggle(file) : set([file]);

    const toggleAll = () => {
        const onPage = new Set(pageFiles.value.map((file) => file.identifier));
        const others = selectedFiles.value.filter(
            (file) => !onPage.has(file.identifier),
        );
        set(allSelected.value ? others : [...others, ...pageFiles.value]);
    };

    const remove = (file: FileMetaRecord) => {
        if (selected.value.has(file.identifier)) {
            toggle(file);
        }
    };

    const clear = () => set([]);

    if (!keepOtherPages) {
        watch(pageFiles, (files) => {
            const visible = new Set(files.map((file) => file.identifier));
            set(
                selectedFiles.value.filter((file) =>
                    visible.has(file.identifier),
                ),
            );
        });
    }

    return {
        selectedFiles,
        selectedIds,
        allSelected,
        pick,
        toggle,
        toggleAll,
        remove,
        clear,
    };
};
