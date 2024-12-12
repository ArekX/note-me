import { BackupTargetRecord } from "$db";
import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import Picker from "$components/Picker.tsx";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import ButtonGroup from "$components/ButtonGroup.tsx";
import BackupTargetList from "$islands/backups/BackupTargetList.tsx";
import BackupTargetForm from "$islands/backups/BackupTargetForm.tsx";

export type EditTargetBackupRecord =
    & Omit<
        BackupTargetRecord,
        "id" | "created_at" | "updated_at" | "last_backup_at"
    >
    & {
        id: number | null;
    };

interface EditTargetProps {
    initialRecord: EditTargetBackupRecord;
    onClose: () => void;
}

export default function ManageBackupTargetDialog({
    initialRecord,
    onClose,
}: EditTargetProps) {
    const {
        items,
        selectItem,
        selected,
    } = useListState({
        edit: initialRecord.id === null ? "Create" : "Configure",
        backups: "Backup List",
    }, "edit");

    return (
        <Dialog
            visible={true}
            canCancel={true}
            onCancel={onClose}
            props={{
                class: selected.value === "backups"
                    ? "w-3/4 max-md:w-full"
                    : "w-2/4 max-md:w-full",
            }}
        >
            <div>
                <h1 class="text-xl mb-4 font-semibold">
                    {initialRecord.id !== null ? "Manage" : "Create"}{" "}
                    Backup Target
                </h1>
            </div>

            {initialRecord.id !== null && (
                <ButtonGroup
                    items={items}
                    activeItem={selected.value}
                    onSelect={selectItem}
                />
            )}

            <Picker<keyof typeof items>
                selector={selected.value}
                map={{
                    backups: () => (
                        <>
                            {initialRecord.id !== null
                                ? (
                                    <BackupTargetList
                                        targetId={initialRecord.id!}
                                        onClose={onClose}
                                    />
                                )
                                : (
                                    <div>
                                        Please create a backup target first.

                                        <div class="py-5">
                                            <Button
                                                color="danger"
                                                onClick={onClose}
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    </div>
                                )}
                        </>
                    ),
                    edit: () => (
                        <BackupTargetForm
                            initialRecord={initialRecord}
                            onClose={onClose}
                        />
                    ),
                }}
            />
        </Dialog>
    );
}
