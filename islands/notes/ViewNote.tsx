import Viewer from "../viewer/Viewer.tsx";
import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { MenuItemActions, MoreMenu } from "$islands/notes/MoreMenu.tsx";
import NoteWindow, { NoteWindowTypes } from "$islands/notes/NoteWindow.tsx";
import { useSignal } from "@preact/signals";

export interface ViewNoteProps {
    readonly?: boolean;
    record: ViewNoteRecord;
}

export function ViewNote(
    { readonly = false, record }: ViewNoteProps,
) {
    const windowMode = useSignal<NoteWindowTypes | null>(null);

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
                    {record.title}
                </div>
                {!readonly && (
                    <div class="text-md ml-2 w-2/12 text-right">
                        <Button
                            color="success"
                            title="Edit"
                            onClick={() => {
                                window.location.href =
                                    `/app/note/edit-${record.id}`;
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
                {record.tags.map((tag) => (
                    <a href={`/notes?tag=${tag}`} class="tag">
                        {`#${tag}`}
                    </a>
                ))}
            </div>
            {record.group_name && (
                <div class="text-sm">&rarr; in {record.group_name}</div>
            )}
            <div>
                <Viewer text={record.note} />
            </div>
            {record.id && (
                <NoteWindow
                    onClose={() => windowMode.value = null}
                    type={windowMode.value}
                    noteId={record.id}
                />
            )}
        </div>
    );
}
