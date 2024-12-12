import { ViewNoteRecord } from "$db";
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
import { downloadTextAsMarkdown } from "$frontend/text-downloader.ts";
import { useActiveNoteEffect } from "$frontend/hooks/use-active-note.ts";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import { useHelp } from "$frontend/hooks/use-help.ts";

export interface ViewNoteProps {
    readonly?: boolean;
    shareMode?: "none" | "everyone" | "users";
    disableTagLinks?: boolean;
    record: ViewNoteRecord;
    historyMode?: boolean;
    author?: string;
}

export default function ViewNote(
    {
        readonly = false,
        record,
        shareMode = "none",
        disableTagLinks,
        historyMode = false,
        author,
    }: ViewNoteProps,
) {
    const windowMode = useSignal<NoteWindowTypes | null>(null);
    const recordData = useSignal<ViewNoteRecord>({
        ...record,
    });
    const search = disableTagLinks ? null : useSearch();

    const help = useHelp();

    const query = useResponsiveQuery();

    if (!historyMode) {
        useActiveNoteEffect(recordData.value.id);
    }

    useEffect(() => {
        recordData.value = {
            ...record,
        };
    }, [record]);

    useNoteWebsocket({
        noteId: record.id,
        onNoteUpdated: (data) => {
            recordData.value = {
                ...recordData.value,
                title: data.title ?? recordData.value.title,
                tags: data.tags ?? recordData.value.tags,
                note: data.text ?? recordData.value.note,
                is_encrypted: data.is_encrypted ??
                    recordData.value.is_encrypted,
                group_id: data.group_id !== undefined
                    ? data.group_id
                    : recordData.value.group_id,
                group_name: data.group_name !== undefined
                    ? data.group_name
                    : recordData.value.group_name,
            };
        },
    });

    const handleMenuItemClicked = (action: MenuItemActions) => {
        switch (action) {
            case "details":
            case "history":
            case "share":
            case "remind":
            case "move":
            case "files":
            case "delete":
                windowMode.value = action;
                break;
            case "help":
                help.open();
                break;
            case "download":
                downloadTextAsMarkdown(
                    recordData.value.title,
                    recordData.value.note,
                );
                break;
            case "open-editor":
                redirectTo.editNote({
                    noteId: recordData.value.id,
                });
                break;
        }
    };

    const handleTagClick = (tag: string) => {
        if (disableTagLinks) {
            return;
        }

        search?.setTags([tag]);
    };

    return (
        <div class="view-note flex flex-col">
            <div class="flex flex-row">
                <div class="title basis-4/6">
                    {recordData.value.title}
                </div>
                {!historyMode && shareMode !== "everyone" && (
                    <div class="basis-2/6 pl-2 w-2/12 text-right">
                        {!readonly && query.min("md") && (
                            <Button
                                color="success"
                                title="Edit"
                                addClass="max-lg:mb-2"
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
            <div class="w-full overflow-hidden">
                {recordData.value.tags.map((tag) => (
                    <span
                        class={`text-ellipsis inline-block tag ${
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
                groupId={recordData.value.group_id}
                groupName={recordData.value.group_name}
                lastUpdatedUnix={recordData.value.updated_at}
                author={author}
            />
            <div class="py-4">
                <Viewer
                    text={recordData.value.note}
                    options={{
                        isSharing: shareMode !== "none",
                    }}
                />
            </div>
            {!historyMode && recordData.value.id && windowMode.value !== null &&
                (
                    <NoteWindow
                        onClose={() => windowMode.value = null}
                        type={windowMode.value}
                        isExistingNoteProtected={recordData.value.is_encrypted}
                        existingNoteText={recordData.value.note}
                        noteId={recordData.value.id}
                    />
                )}
        </div>
    );
}
