import Dialog from "$islands/Dialog.tsx";
import { useSignal } from "@preact/signals";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import Button from "$components/Button.tsx";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useEffect } from "preact/hooks";
import {
    GetSingleGroupMessage,
    GetSingleGroupResponse,
} from "$workers/websocket/api/groups/messages.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import TimeAgo from "$components/TimeAgo.tsx";

interface GroupDetailsProps {
    groupId: number;
    onClose: () => void;
}

export default function GroupDetails(
    { groupId, onClose }: GroupDetailsProps,
) {
    const groupData = useSignal<GroupRecord | null>(null);

    const groupLoader = useLoader(true);

    const { sendMessage } = useWebsocketService();

    const loadGroupData = groupLoader.wrap(async () => {
        const response = await sendMessage<
            GetSingleGroupMessage,
            GetSingleGroupResponse
        >("groups", "getSingleGroup", {
            data: {
                id: groupId,
            },
            expect: "getSingleGroupResponse",
        });

        groupData.value = response.record;
    });

    useEffect(() => {
        loadGroupData();
    }, [groupId]);

    const { name, created_at, has_subgroups, has_notes } = groupData.value ??
        {};
    return (
        <Dialog visible={true} canCancel={true} onCancel={onClose}>
            {groupLoader.running
                ? <Loader color="white" />
                : groupData.value && (
                    <div>
                        <h1 class="text-2xl pb-4">Group Details</h1>

                        <p class="pt-2 pb-2">
                            <strong>Group ID:</strong> {groupId} <br />
                            <strong>Name:</strong> {name} <br />
                            <strong>Created:</strong>{"  "}
                            <TimeAgo time={created_at} /> <br />
                            <strong>Has groups inside:</strong>{" "}
                            {has_subgroups ? "Yes" : "No"} <br />
                            <strong>Has notes inside:</strong>{" "}
                            {has_notes ? "Yes" : "No"} <br />
                        </p>

                        <div class="pt-4 text-right">
                            <Button onClick={onClose} color="primary">
                                Close
                            </Button>
                        </div>
                    </div>
                )}
        </Dialog>
    );
}
