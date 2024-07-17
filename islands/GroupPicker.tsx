import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import {
    GetTreeMessage,
    GetTreeResponse,
} from "$workers/websocket/api/tree/messages.ts";
import { useEffect } from "preact/hooks";
import { TreeRecord } from "$backend/repository/tree-list.repository.ts";
import { useSignal } from "@preact/signals";
import Icon from "$components/Icon.tsx";
import Loader from "$islands/Loader.tsx";

interface GroupPickerItemProps {
    record: TreeRecord;
    selectedId?: number | null;
    onPick?: (record: TreeRecord) => void;
}

const GroupPickerItem = ({
    record,
    onPick,
    selectedId,
}: GroupPickerItemProps) => {
    const children = useSignal<TreeRecord[] | null>(null);
    const { sendMessage } = useWebsocketService();
    const loader = useLoader();
    const isOpen = useSignal(false);

    const loadChildren = loader.wrap(async () => {
        const response = await sendMessage<GetTreeMessage, GetTreeResponse>(
            "tree",
            "getTree",
            {
                data: {
                    parent_id: record.id,
                    item_type: "group",
                },
                expect: "getTreeResponse",
            },
        );

        children.value = response.records;
    });

    const handlePick = (e: Event) => {
        e.stopPropagation();

        onPick?.(record);
    };

    const handleToggleOpenClose = async (e: Event) => {
        e.stopPropagation();

        if (record.has_children !== 1) {
            return;
        }

        if (children.value === null) {
            await loadChildren();
        }

        isOpen.value = !isOpen.value;
    };

    return (
        <div
            onClick={handlePick}
            onDblClick={handleToggleOpenClose}
            class="cursor-pointer"
        >
            <div
                class={`hover:bg-gray-500 select-none p-1 rounded-md ${
                    record.id === selectedId ? "bg-yellow-700" : ""
                }`}
            >
                <Icon
                    type={record.has_children ? "solid" : "regular"}
                    name={isOpen.value ? "folder-open" : "folder"}
                    className="mr-1"
                />
                <span class="mt-1 inline-block align-middle">
                    {record.name}
                </span>
            </div>
            {isOpen.value && children.value !== null &&
                (loader.running ? <Loader color="white" /> : (
                    <div class="pl-4">
                        {children.value.map((record) => (
                            <GroupPickerItem
                                key={record.id}
                                selectedId={selectedId}
                                record={record}
                                onPick={onPick}
                            />
                        ))}
                    </div>
                ))}
        </div>
    );
};

interface GroupPickerProps {
    selectedId?: number | null;
    onPick?: (record: TreeRecord) => void;
}

export default function GroupPicker({
    selectedId,
    onPick,
}: GroupPickerProps) {
    const { sendMessage } = useWebsocketService();
    const pickerLoader = useLoader();
    const rootRecords = useSignal<TreeRecord[]>([]);

    const loadGroup = pickerLoader.wrap(async () => {
        const response = await sendMessage<GetTreeMessage, GetTreeResponse>(
            "tree",
            "getTree",
            {
                data: {
                    item_type: "group",
                },
                expect: "getTreeResponse",
            },
        );

        rootRecords.value = response.records;
    });

    useEffect(() => {
        loadGroup();
    }, []);

    return (
        <div class="border-solid border-gray-700 p-4 border-2 group-picker">
            {pickerLoader.running ? <Loader color="white" /> : (
                <>
                    {rootRecords.value.length === 0 && (
                        <div class="text-center text-gray-400">
                            No groups found
                        </div>
                    )}
                    {rootRecords.value.map((record) => (
                        <GroupPickerItem
                            key={record.id}
                            selectedId={selectedId}
                            record={record}
                            onPick={onPick}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
