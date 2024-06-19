import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import MoreMenu, { MenuItemActions } from "$islands/notes/MoreMenu.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import { useSignal } from "@preact/signals";
import { redirectTo } from "$frontend/redirection-manager.ts";
import { useNoteWebsocket } from "$islands/notes/hooks/use-note-websocket.ts";
import { useEffect } from "preact/hooks";
import DetailsLine from "$islands/notes/DetailsLine.tsx";
import Viewer from "$islands/markdown/Viewer.tsx";

export interface ViewNoteProps {
    readonly?: boolean;
    record: ViewNoteRecord;
}

export default function ViewNote(
    { readonly = false, record }: ViewNoteProps,
) {
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const recordData = useSignal<ViewNoteRecord>(record);

    useEffect(() => {
        recordData.value = { ...record };
    }, [record]);

    useNoteWebsocket({
        noteId: record.id,
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
            <DetailsLine
                groupName={recordData.value.group_name}
                lastUpdatedUnix={recordData.value.updated_at}
            />
            <div>
                <Viewer text={recordData.value.note} />
            </div>
            {recordData.value.id && (
                <NoteWindow
                    onClose={() => windowMode.value = null}
                    type={windowMode.value}
                    noteText={recordData.value.note}
                    noteId={recordData.value.id}
                />
            )}
        </div>
    );
}
