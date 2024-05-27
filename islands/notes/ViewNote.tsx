import Viewer from "../viewer/Viewer.tsx";
import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import MoreMenu, { MenuItemActions } from "$islands/notes/MoreMenu.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import { useSignal } from "@preact/signals";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { useNoteWebsocket } from "$islands/notes/hooks/use-note-websocket.ts";

export interface ViewNoteProps {
    readonly?: boolean;
    initialRecord: ViewNoteRecord;
}

export default function ViewNote(
    { readonly = false, initialRecord }: ViewNoteProps,
) {
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const recordData = useSignal<ViewNoteRecord>(initialRecord);

    useNoteWebsocket({
        noteId: initialRecord.id,
        onRenamed: (newName) => {
            recordData.value = { ...recordData.value, title: newName };
        },
    });

    const handleMenuItemClicked = (action: MenuItemActions) => {
        switch (action) {
            case "details":
            case "history":
            case "share":
            case "remind":
            case "help":
            case "delete":
                windowMode.value = action;
                break;
        }
    };

    return (
        <div class="view-note flex flex-col">
            <div class="flex flex-row">
                <div class="title w-10/12">
                    {recordData.value.title}
                </div>
                {!readonly && (
                    <div class="text-md ml-2 w-2/12 text-right">
                        <Button
                            color="success"
                            title="Edit"
                            onClick={() => {
                                redirectTo.editNote({
                                    noteId: recordData.value.id,
                                });
                            }}
                        >
                            <Icon name="pencil" size="lg" />
                        </Button>{" "}
                        <div class="text-left inline-block">
                            <MoreMenu
                                onMenuItemClick={handleMenuItemClicked}
                                inPreviewMode={false}
                                mode="view"
                            />
                        </div>
                    </div>
                )}
            </div>
            <div>
                {recordData.value.tags.map((tag) => (
                    <a href={`/notes?tag=${tag}`} class="tag">
                        {`#${tag}`}
                    </a>
                ))}
            </div>
            {recordData.value.group_name && (
                <div class="text-sm">
                    &rarr; in {recordData.value.group_name}
                </div>
            )}
            <div>
                <Viewer text={recordData.value.note} />
            </div>
            {recordData.value.id && (
                <NoteWindow
                    onClose={() => windowMode.value = null}
                    type={windowMode.value}
                    noteId={recordData.value.id}
                />
            )}
        </div>
    );
}
