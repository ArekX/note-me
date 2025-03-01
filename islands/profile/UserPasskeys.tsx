import Button from "$components/Button.tsx";
import { startRegistration } from "$frontend/deps.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import {
    DeleteOwnPasskeyMessage,
    DeleteOwnPasskeyResponse,
    GetOwnPasskeysMessage,
    GetOwnPasskeysResponse,
    GetPasskeyRegistrationMessage,
    GetPasskeyRegistrationResponse,
    UpdateOwnPasskeyMessage,
    UpdateOwnPasskeyResponse,
    UserFrontendResponse,
    VerifyPasskeyRegistrationMessage,
    VerifyPasskeyRegistrationResponse,
} from "$workers/websocket/api/users/messages.ts";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import Loader from "$islands/Loader.tsx";
import { addMessage } from "$frontend/toast-message.ts";
import { usePagedData } from "$frontend/hooks/use-paged-data.ts";
import { UserPasskeyRecord } from "$db";
import { useEffect } from "preact/hooks";
import Table from "$components/Table.tsx";
import Pagination from "$islands/Pagination.tsx";
import TimeAgo from "$components/TimeAgo.tsx";
import { useSelected } from "$frontend/hooks/use-selected.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import Icon from "$components/Icon.tsx";
import Dialog from "$islands/Dialog.tsx";
import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";

interface PasskeyRenameDialogProps {
    record: UserPasskeyRecord;
    onCancel: () => void;
}

const PasskeyRenameDialog = ({
    record,
    onCancel,
}: PasskeyRenameDialogProps) => {
    const name = useSignal(record.name);
    const processorLoader = useLoader();

    const { sendMessage } = useWebsocketService();

    const updatePasskeyName = processorLoader.wrap(async () => {
        await sendMessage<UpdateOwnPasskeyMessage, UpdateOwnPasskeyResponse>(
            "users",
            "updateOwnPasskey",
            {
                data: {
                    id: record.id,
                    name: name.value,
                },
                expect: "updateOwnPasskeyResponse",
            },
        );

        onCancel();
    });

    return (
        <Dialog
            onCancel={onCancel}
            canCancel
        >
            {processorLoader.running
                ? <Loader color="white">Saving...</Loader>
                : (
                    <div>
                        <Input
                            label="Passkey Name"
                            value={name.value}
                            onInput={(value) => name.value = value}
                            onKeydown={(e) => {
                                if (e.key === "Enter") {
                                    updatePasskeyName();
                                }
                            }}
                        />

                        <div class="py-4">
                            <Button addClass="mr-2" onClick={updatePasskeyName}>
                                Rename
                            </Button>
                            <Button
                                color="danger"
                                addClass="mr-2"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
        </Dialog>
    );
};

export default function UserPasskeys() {
    const { sendMessage } = useWebsocketService<UserFrontendResponse>({
        eventMap: {
            users: {
                deleteOwnPasskeyResponse: async () => {
                    await loadUserPasskeys();
                    if (results.value.length === 0) {
                        resetPage();
                        loadUserPasskeys();
                    }

                    passkeyToDelete.unselect();
                },
                updateOwnPasskeyResponse: (response) => {
                    const passkey = results.value.find(
                        (p) => p.id === response.id,
                    );

                    if (passkey) {
                        passkey.name = response.name;
                    }

                    results.value = [...results.value];
                },
            },
        },
    });

    const registerPasskeyLoader = useLoader();

    const passkeyDataLoader = useLoader(true);

    const passkeyToDelete = useSelected<UserPasskeyRecord>();

    const passkeyToRename = useSelected<UserPasskeyRecord>();

    const {
        total,
        page,
        perPage,
        results,
        setPagedData,
        resetPage,
    } = usePagedData<UserPasskeyRecord>();

    const registerDevice = registerPasskeyLoader.wrap(async () => {
        try {
            const options = await sendMessage<
                GetPasskeyRegistrationMessage,
                GetPasskeyRegistrationResponse
            >("users", "getPasskeyRegistrationOptions", {
                expect: "getPasskeyRegistrationOptionsResponse",
            });

            const credential = await startRegistration(options.options);

            const result = await sendMessage<
                VerifyPasskeyRegistrationMessage,
                VerifyPasskeyRegistrationResponse
            >("users", "verifyPasskeyRegistration", {
                data: {
                    response: credential,
                },
                expect: "verifyPasskeyRegistrationResponse",
            });

            if (!result.success) {
                addMessage({
                    type: "error",
                    text:
                        `Failed to register a passkey device. Reason: ${result.fail_reason}`,
                });
            } else {
                loadUserPasskeys();
            }
        } catch (e: SystemErrorMessage | Error | unknown) {
            const message = (e instanceof Object && "data" in e)
                ? (e as SystemErrorMessage).data.message
                : e instanceof Error
                ? e.message
                : "Unknown error";
            addMessage({
                type: "error",
                text: `Registration failed due to: ${message}`,
            });
        }
    });

    const loadUserPasskeys = passkeyDataLoader.wrap(async () => {
        const response = await sendMessage<
            GetOwnPasskeysMessage,
            GetOwnPasskeysResponse
        >("users", "getOwnPasskeys", {
            data: {
                page: page.value,
            },
            expect: "getOwnPasskeysResponse",
        });

        setPagedData(response.records);
    });

    const handleUpdatePage = (newPage: number) => {
        setPagedData({ page: newPage });
        loadUserPasskeys();
    };

    useEffect(() => {
        loadUserPasskeys();
    }, []);

    const deleteSelectedPasskey = async () => {
        await sendMessage<DeleteOwnPasskeyMessage, DeleteOwnPasskeyResponse>(
            "users",
            "deleteOwnPasskey",
            {
                data: {
                    id: passkeyToDelete.selected.value!.id,
                },
                expect: "deleteOwnPasskeyResponse",
            },
        );

        passkeyToDelete.unselect();
    };

    return (
        <div>
            <h1 class="text-xl py-4">My Passkeys</h1>
            <div class="py-2">
                Passkeys allow you to use your device or security key to log in
                to your account without the need for a password. You can
                register a new device or security key here.
            </div>
            {registerPasskeyLoader.running
                ? <Loader>Waiting...</Loader>
                : (
                    <Button
                        onClick={registerDevice}
                        addClass="my-2"
                        color="success"
                    >
                        Register device
                    </Button>
                )}

            <div class="py-2">
                <h2 class="text-lg py-4 font-semibold">Registered Passkeys</h2>

                <Table<UserPasskeyRecord>
                    isLoading={passkeyDataLoader.running}
                    noRowsRow={
                        <tr>
                            <td colSpan={4} class="text-center">
                                No registered passkeys found.
                            </td>
                        </tr>
                    }
                    columns={[
                        {
                            key: "name",
                            name: "Name",
                        },
                        {
                            name: "Created at",
                            render: (record) => (
                                <TimeAgo time={record.created_at} />
                            ),
                        },
                        {
                            name: "Last used",
                            render: (record) => (
                                <TimeAgo time={record.last_used_at} />
                            ),
                        },
                        {
                            name: "Actions",
                            headerCellProps: {
                                class: "w-1/6",
                            },
                            render: (record) => (
                                <>
                                    <Button
                                        color="primary"
                                        title="Rename"
                                        onClick={() =>
                                            passkeyToRename.select(record)}
                                        addClass="mr-2 mb-2"
                                    >
                                        <Icon name="pencil" size="md" />
                                    </Button>
                                    <Button
                                        color="danger"
                                        title="Delete"
                                        onClick={() =>
                                            passkeyToDelete.select(record)}
                                    >
                                        <Icon
                                            name="minus-circle"
                                            size="md"
                                        />
                                    </Button>
                                </>
                            ),
                        },
                    ]}
                    rows={results.value}
                    headerRowProps={{
                        class: "text-left",
                    }}
                />

                <Pagination
                    currentPage={page.value}
                    perPage={perPage.value}
                    total={total.value}
                    onChange={handleUpdatePage}
                />
            </div>
            {passkeyToDelete.isSelected() && (
                <ConfirmDialog
                    prompt="Are you sure you want to delete this passkey? You will no longer be able to use it to log in."
                    confirmText="Delete passkey"
                    confirmColor="danger"
                    visible
                    onCancel={() => passkeyToDelete.unselect()}
                    onConfirm={() => deleteSelectedPasskey()}
                />
            )}
            {passkeyToRename.isSelected() && (
                <PasskeyRenameDialog
                    record={passkeyToRename.selected.value!}
                    onCancel={() => passkeyToRename.unselect()}
                />
            )}
        </div>
    );
}
