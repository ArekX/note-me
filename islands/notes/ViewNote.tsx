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
import { useSearch } from "$frontend/hooks/use-search.ts";
import { useNoteText } from "$islands/notes/hooks/use-note-text.ts";
import ProtectedAreaWrapper from "$islands/encryption/ProtectedAreaWrapper.tsx";

export interface ViewNoteProps {
    readonly?: boolean;
    shareMode?: "none" | "everyone" | "users";
    disableTagLinks?: boolean;
    record: ViewNoteRecord;
    author?: string;
}

export default function ViewNote(
    {
        readonly = false,
        record,
        shareMode = "none",
        disableTagLinks,
        author,
    }: ViewNoteProps,
) {
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const recordData = useSignal<ViewNoteRecord>({
        ...record,
        note: record.is_encrypted ? "" : record.note,
    });
    const noteText = useNoteText({
        initialData: {
            text: record.note,
            is_encrypted: record.is_encrypted,
        },
    });
    const search = disableTagLinks ? null : useSearch();

    useEffect(() => {
        recordData.value = {
            ...record,
            note: record.is_encrypted ? "" : record.note,
        };

        noteText.setInputData({
            text: record.note,
            is_encrypted: recordData.value.is_encrypted,
        });
    }, [record]);

    useNoteWebsocket({
        noteId: record.id,
        onNoteUpdated: async (data) => {
            let text = data.text ?? recordData.value.note;
            if (data.text && data.is_encrypted) {
                noteText.setInputData({
                    text: data.text,
                    is_encrypted: true,
                });
                text = await noteText.getText() ?? "";
            }

            recordData.value = {
                ...recordData.value,
                title: data.title ?? recordData.value.title,
                tags: data.tags ?? recordData.value.tags,
                note: text,
                is_encrypted: data.is_encrypted ??
                    recordData.value.is_encrypted,
                group_id: data.group_id !== undefined
                    ? data.group_id
                    : recordData.value.group_id,
                group_name: data.group_name !== undefined
                    ? data.group_name
                    : recordData.value.group_name,
            };
            noteText.setInputData({
                text: recordData.value.note,
                is_encrypted: recordData.value.is_encrypted,
            });
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

    const handleTagClick = (tag: string) => {
        if (disableTagLinks) {
            return;
        }

        search?.setTags([tag]);
    };

    const handleUnlock = async () => {
        recordData.value = {
            ...recordData.value,
            note: await noteText.getText() ?? "",
        };
    };

    return (
        <ProtectedAreaWrapper
            requirePassword={noteText.needsUnlocking.value}
            onUnlock={handleUnlock}
        >
            <div class="view-note flex flex-col">
                <div class="flex flex-row">
                    <div class="title w-10/12">
                        {recordData.value.title}
                    </div>
                    {shareMode !== "everyone" && (
                        <div class="text-md ml-2 w-2/12 text-right">
                            {!readonly && (
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
                                </Button>
                            )}{" "}
                            <div class="text-left inline-block">
                                <MoreMenu
                                    onMenuItemClick={handleMenuItemClicked}
                                    inPreviewMode={false}
                                    mode={readonly ? "view-readonly" : "view"}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div>
                    {recordData.value.tags.map((tag) => (
                        <span
                            class={`tag ${
                                disableTagLinks
                                    ? "cursor-default pointer-events-none"
                                    : "cursor-pointer"
                            }`}
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
                <DetailsLine
                    groupName={recordData.value.group_name}
                    lastUpdatedUnix={recordData.value.updated_at}
                    author={author}
                />
                <div>
                    <Viewer
                        text={recordData.value.note}
                        options={{
                            isSharing: shareMode !== "none",
                        }}
                    />
                </div>
                {recordData.value.id && (
                    <NoteWindow
                        onClose={() => windowMode.value = null}
                        type={windowMode.value}
                        existingNoteData={{
                            text: recordData.value.note,
                            is_encrypted: recordData.value.is_encrypted,
                            is_resolved: true,
                        }}
                        noteId={recordData.value.id}
                    />
                )}
            </div>
        </ProtectedAreaWrapper>
    );
}
