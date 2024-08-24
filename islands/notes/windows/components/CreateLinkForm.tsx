import Checkbox from "$islands/Checkbox.tsx";
import Input from "$components/Input.tsx";
import Button from "$components/Button.tsx";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    CreatePublicShareMessage,
    CreatePublicShareResponse,
} from "$workers/websocket/api/notes/messages.ts";
import { inputDateToUnix } from "$lib/time/unix.ts";
import { PublicNoteShareRecord } from "$backend/repository/note-share-repository.ts";
import { addDays } from "$lib/time/modifiers.ts";
import { dateToYmd } from "$lib/time/iso-date.ts";

interface CreateLinkFormProps {
    noteId: number;
    onLinkCreated: (record: PublicNoteShareRecord) => void;
}

export default function CreateLinkForm({
    noteId,
    onLinkCreated,
}: CreateLinkFormProps) {
    const includeExpiration = useSignal(false);
    const expiresAt = useSignal("");

    const createLinkLoader = useLoader();

    const { sendMessage } = useWebsocketService();

    const handleToggleExpiration = () => {
        includeExpiration.value = !includeExpiration.value;
        if (!includeExpiration.value) {
            expiresAt.value = "";
        }
    };

    const handleCreateLink = createLinkLoader.wrap(async () => {
        const response = await sendMessage<
            CreatePublicShareMessage,
            CreatePublicShareResponse
        >(
            "notes",
            "createPublicShare",
            {
                data: {
                    note_id: noteId,
                    expires_at: includeExpiration.value
                        ? inputDateToUnix(expiresAt.value)
                        : null,
                },
                expect: "createPublicShareResponse",
            },
        );

        expiresAt.value = "";
        includeExpiration.value = false;

        onLinkCreated(response.record);
    });

    return (
        <>
            <div class="text-xl font-semibold py-2">New link</div>
            <div class="flex items-start flex-wrap">
                <div class="mt-2">
                    {createLinkLoader.running
                        ? <Loader color="white">Saving...</Loader>
                        : (
                            <Button
                                color="success"
                                disabled={includeExpiration.value &&
                                    expiresAt.value.length === 0}
                                onClick={handleCreateLink}
                            >
                                Create link
                            </Button>
                        )}
                </div>
                <div class="max-md:basis-full flex flex-wrap items-start link-form-expiration ml-2">
                    <div class="pr-2 pt-4">
                        <Checkbox
                            label="Add expiration date"
                            checked={includeExpiration.value}
                            onChange={handleToggleExpiration}
                        />
                    </div>
                    {includeExpiration.value
                        ? (
                            <div class="h-14 max-md:basis-full">
                                <Input
                                    type="date"
                                    value={expiresAt.value}
                                    min={dateToYmd(addDays(1))}
                                    onInput={(value) => expiresAt.value = value}
                                />
                                {expiresAt.value.length === 0 && (
                                    <div class="text-sm text-red-400">
                                        Please enter expiration date.
                                    </div>
                                )}
                            </div>
                        )
                        : <div class="h-14 w-10"></div>}
                </div>
            </div>
        </>
    );
}
