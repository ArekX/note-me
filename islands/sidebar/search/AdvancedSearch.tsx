import Dialog from "$islands/Dialog.tsx";
import Button from "$components/Button.tsx";
import { useSignal } from "@preact/signals";
import GroupPicker from "$islands/GroupPicker.tsx";

interface AdvancedSearchProps {
    onClose: () => void;
}

export default function AdvancedSearch({ onClose }: AdvancedSearchProps) {
    const selectedGroupId = useSignal<number | null>(null);

    return (
        <Dialog
            visible={true}
            canCancel={true}
            onCancel={onClose}
        >
            <div>
                Advanced Search

                <GroupPicker
                    selectedId={selectedGroupId.value}
                    onPick={(r) => selectedGroupId.value = r.id}
                />
            </div>

            <Button color="success" onClick={onClose}>Search</Button>{" "}
            <Button color="danger" onClick={onClose}>Close</Button>
        </Dialog>
    );
}
