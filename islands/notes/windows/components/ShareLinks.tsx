import Button from "$components/Button.tsx";
import { PublicNoteShareRecord } from "$backend/repository/note-share-repository.ts";
import CreateLinkForm from "$islands/notes/windows/components/CreateLinkForm.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    RemovePublicShareMessage,
    RemovePublicShareResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Icon from "$components/Icon.tsx";
import { useTimeFormat } from "$frontend/hooks/use-time-format.ts";
import { timeAgo } from "$lib/time/time-ago.ts";
import { addMessage } from "$frontend/toast-message.ts";
import TimeAgo from "$components/TimeAgo.tsx";

interface ShareLinksProps {
    initialLinks: PublicNoteShareRecord[];
    noteId: number;
    onLinkListChanged: (newList: PublicNoteShareRecord[]) => void;
}

export default function ShareLinks({
    initialLinks,
    noteId,
    onLinkListChanged,
}: ShareLinksProps) {
    const { sendMessage } = useWebsocketService();

    const linkList = useSignal<PublicNoteShareRecord[]>(initialLinks);

    const timeFormatter = useTimeFormat();

    const handleLinkCreated = (link: PublicNoteShareRecord) => {
        linkList.value = [link, ...linkList.value];
        onLinkListChanged(linkList.value);
    };

    const handleDeleteLink = async (link: PublicNoteShareRecord) => {
        await sendMessage<RemovePublicShareMessage, RemovePublicShareResponse>(
            "notes",
            "removePublicShare",
            {
                data: {
                    note_id: noteId,
                    id: link.id,
                },
                expect: "removePublicShareResponse",
            },
        );

        linkList.value = linkList.value.filter((l) => l.id !== link.id);
        onLinkListChanged(linkList.value);
    };

    const handleCopyToClipboard = (link: PublicNoteShareRecord) => {
        navigator.clipboard.writeText(
            `${globalThis.location.origin}/public/${link.identifier}`,
        );
        addMessage({
            type: "success",
            text: `Link "${link.identifier}" copied to clipboard`,
        });
    };

    return (
        <div>
            <strong>Important:</strong>{" "}
            Links generated here can be viewed by anyone with that link.

            <div class="mt-4">
                <strong>Existing links:</strong>
                {linkList.value.map((link) => (
                    <div
                        key={link.id}
                        class="flex justify-between pb-2 border-b-2 border-b-gray-400 mb-2 last:border-b-transparent"
                    >
                        <div>
                            <a
                                href={`/public/${link.identifier}`}
                                target="_blank"
                                rel="noreferrer"
                                class="text-lg block mb-2 underline"
                            >
                                Link: {link.identifier}
                            </a>
                            <div class="text-sm">
                                <p
                                    title={link.expires_at
                                        ? timeFormatter.formatDateTime(
                                            link.expires_at,
                                        )
                                        : "Never expires"}
                                >
                                    Expires {link.expires_at
                                        ? timeAgo(
                                            link.expires_at,
                                        )
                                        : "- never"}
                                </p>
                                <p
                                    title={timeFormatter.formatDateTime(
                                        link.created_at,
                                    )}
                                >
                                    Created <TimeAgo time={link.created_at} />
                                </p>
                            </div>
                        </div>
                        <div>
                            <Button
                                color="success"
                                size="sm"
                                onClick={() => handleCopyToClipboard(link)}
                            >
                                <Icon name="clipboard" />
                            </Button>
                            <Button
                                addClass="ml-2"
                                color="danger"
                                size="sm"
                                onClick={() => handleDeleteLink(link)}
                            >
                                <Icon name="minus-circle" />
                            </Button>
                        </div>
                    </div>
                ))}

                {linkList.value.length === 0 && (
                    <div class="text-gray-500">
                        No public links created.
                    </div>
                )}
            </div>

            <CreateLinkForm noteId={noteId} onLinkCreated={handleLinkCreated} />
        </div>
    );
}
