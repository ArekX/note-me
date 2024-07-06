import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { GroupFrontendResponse } from "$workers/websocket/api/groups/messages.ts";

export function DeleteGroupProgressDialog() {
    const deletedCount = useSignal<number | null>(null);

    useWebsocketService<GroupFrontendResponse>({
        eventMap: {
            groups: {
                deleteGroupProgress: (data) => {
                    deletedCount.value = data.deleted_count;
                },
            },
        },
    });

    return (
        <Dialog canCancel={false} visible={true}>
            <div class="flex flex-col items-center p-4">
                <div class="text-lg font-bold">
                    {deletedCount.value === null
                        ? "Deleting group and its contents..."
                        : `Deleted ${deletedCount.value} items...`}
                </div>
                <div class="text-sm text-gray-300">Please wait</div>
            </div>
        </Dialog>
    );
}
