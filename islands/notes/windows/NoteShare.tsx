import Button from "$components/Button.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import ButtonGroup from "$components/ButtonGroup.tsx";
import Picker from "$components/Picker.tsx";

export default function NoteShare({
    onClose,
}: NoteWindowComponentProps) {
    const {
        items,
        selectItem,
        selected,
    } = useListState({
        toUsers: "To users",
        toEveryone: "To everyone",
    }, "toUsers");

    return (
        <Dialog
            visible={true}
            onCancel={onClose}
            canCancel={true}
            props={{ "class": "w-2/4" }}
        >
            <h1 class="text-2xl pb-4">Share Note</h1>

            <div class="pb-4">
                Share status: <strong>Private</strong>
            </div>

            <ButtonGroup
                activeItem={selected.value}
                items={items}
                onSelect={selectItem}
            />

            <div class="pt-4 pb-4">
                <Picker<keyof typeof items>
                    selector={selected.value}
                    map={{
                        toUsers: () => <div>Users</div>,
                        toEveryone: () => (
                            <div>
                                Notes shared with everyone can be viewed by
                                anyone.

                                <div class="pt-4">
                                    <Button color="primary">
                                        Generate share link
                                    </Button>
                                </div>
                            </div>
                        ),
                    }}
                />
            </div>

            <div>
                <Button color="danger" onClick={onClose}>Close</Button>
            </div>
        </Dialog>
    );
}
