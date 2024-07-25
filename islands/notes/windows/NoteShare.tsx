import Button from "$components/Button.tsx";
import { NoteWindowComponentProps } from "$islands/notes/NoteWindow.tsx";
import Dialog from "$islands/Dialog.tsx";
import { useListState } from "$frontend/hooks/use-list-state.ts";
import ButtonGroup from "$components/ButtonGroup.tsx";
import Picker from "$components/Picker.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetNoteShareDataMessage,
    GetNoteShareDataResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";
import ShareToUsers from "$islands/notes/windows/components/ShareToUsers.tsx";
import ShareLinks from "$islands/notes/windows/components/ShareLinks.tsx";
import { PublicNoteShareRecord } from "$backend/repository/note-share-repository.ts";
import { PickUserRecord } from "$backend/repository/user-repository.ts";

export default function NoteShare({
    noteId,
    onClose,
    noteText,
}: NoteWindowComponentProps) {
    const {
        items,
        selectItem,
        selected,
    } = useListState({
        toUsers: "To users",
        toEveryone: "To everyone",
    }, "toUsers");

    const shareDataLoader = useLoader();

    const shareData = useSignal<
        Pick<GetNoteShareDataResponse, "users" | "links">
    >({
        users: [],
        links: [],
    });

    const loadShareData = shareDataLoader.wrap(async () => {
        const response = await sendMessage<
            GetNoteShareDataMessage,
            GetNoteShareDataResponse
        >(
            "notes",
            "getNoteShareData",
            {
                data: {
                    note_id: noteId,
                },
                expect: "getNoteShareDataResponse",
            },
        );

        shareData.value = {
            users: response.users,
            links: response.links,
        };
    });

    const { sendMessage } = useWebsocketService();

    const getShareStatus = () => {
        if (
            shareData.value.users.length === 0 &&
            shareData.value.links.length === 0
        ) {
            return "Private";
        }

        if (shareData.value.links.length > 0) {
            return "Public";
        }

        return "Specific users only";
    };

    const handleLinkListChanged = (newList: PublicNoteShareRecord[]) => {
        shareData.value = {
            ...shareData.value,
            links: newList,
        };
    };

    const handleUserListChanged = (newList: PickUserRecord[]) => {
        shareData.value = {
            ...shareData.value,
            users: newList,
        };
    };

    useEffect(() => {
        loadShareData();
    }, []);

    return (
        <Dialog
            visible={true}
            onCancel={onClose}
            canCancel={true}
            props={{ "class": "w-2/4" }}
        >
            <h1 class="text-2xl pb-4">Share Note</h1>

            {noteText.isEncrypted.value && (
                <div class="my-4 border-2 border-red-700 p-4 bg-red-950">
                    <strong>Important:</strong>{" "}
                    This note is protected. You are the only person who can view
                    it, any other user attempting to view this note will not be
                    able to open it.
                </div>
            )}

            {shareDataLoader.running ? <Loader color="white" /> : (
                <div>
                    <div class="pb-4">
                        Share status:{" "}
                        <strong>
                            {getShareStatus()}
                        </strong>
                    </div>

                    <div>
                        <ButtonGroup
                            activeItem={selected.value}
                            items={items}
                            onSelect={selectItem}
                        />

                        <div class="pt-4 pb-4">
                            <Picker<keyof typeof items>
                                selector={selected.value}
                                map={{
                                    toUsers: () => (
                                        <ShareToUsers
                                            initialUsers={shareData.value.users}
                                            noteId={noteId}
                                            onUserListChanged={handleUserListChanged}
                                        />
                                    ),
                                    toEveryone: () => (
                                        <ShareLinks
                                            initialLinks={shareData.value.links}
                                            noteId={noteId}
                                            onLinkListChanged={handleLinkListChanged}
                                        />
                                    ),
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div>
                <Button color="danger" onClick={onClose}>
                    Close
                </Button>
            </div>
        </Dialog>
    );
}
