import Button from "$components/Button.tsx";
import { PublicNoteShareRecord } from "$db";
import CreateLinkForm from "$islands/notes/windows/components/CreateLinkForm.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    RemovePublicShareMessage,
    RemovePublicShareResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Icon from "$components/Icon.tsx";
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
                <div class="text-xl font-semibold py-2">
                    Public links for this note
                </div>
                {linkList.value.map((link) => (
                    <div
                        key={link.id}
                        class="flex flex-wrap items-center justify-between p-2 border rounded-lg border-b-0 border-gray-500/50 bg-gray-700/50 mb-2"
                    >
                        <div class="max-md:basis-full max-md:max-w-full">
                            <a
                                href={`/public/${link.identifier}`}
                                target="_blank"
                                rel="noreferrer"
                                class="text-md font-semibold block mb-2 underline whitespace-nowrap overflow-hidden text-ellipsis"
                            >
                                Link: {link.identifier}
                            </a>
                            <div class="text-sm">
                                <p>
                                    Expires{" "}
                                    <TimeAgo
                                        time={link.expires_at}
                                        emptyText="- never"
                                    />
                                </p>
                                <p>
                                    Created <TimeAgo time={link.created_at} />
                                </p>
                            </div>
                        </div>
                        <div class="max-md:flex max-md:basis-full max-md:pt-2">
                            <Button
                                color="success"
                                size="sm"
                                addClass="md:mr-2 max-md:block max-md:basis-1/2"
                                onClick={() => handleCopyToClipboard(link)}
                            >
                                <Icon name="clipboard" />
                            </Button>
                            <Button
                                color="danger"
                                size="sm"
                                addClass="max-md:ml-2 max-md:block max-md:basis-1/2"
                                onClick={() => handleDeleteLink(link)}
                            >
                                <Icon name="minus-circle" />
                            </Button>
                        </div>
                    </div>
                ))}

                {linkList.value.length === 0 && (
                    <div class="text-gray-400">
                        No public links created.
                    </div>
                )}
            </div>

            <CreateLinkForm noteId={noteId} onLinkCreated={handleLinkCreated} />
        </div>
    );
}
