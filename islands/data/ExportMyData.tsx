import Button from "$components/Button.tsx";
import Icon from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import {
    SystemErrorMessage,
    useWebsocketService,
} from "$frontend/hooks/use-websocket-service.ts";
import Dialog from "$islands/Dialog.tsx";
import {
    CancelExportOwnDataMessage,
    CancelExportOwnDataResponse,
    ExportOwnDataMessage,
    ExportOwnDataResponse,
    UserFrontendResponse,
} from "$workers/websocket/api/users/messages.ts";
import { useProtectionLock } from "$frontend/hooks/use-protection-lock.ts";
import { addMessage, addSystemErrorMessage } from "$frontend/toast-message.ts";
import { useEffect } from "preact/hooks";
import {
    addBeforeRedirectListener,
    removeBeforeRedirectListener,
} from "$frontend/redirection-manager.ts";

export default function ExportMyData() {
    const confirmExport = useSignal(false);
    const processingLoader = useLoader();
    const processingProgress = useSignal(0);
    const protectionLock = useProtectionLock();
    const jobId = useSignal<string | null>(null);
    const exportId = useSignal<string | null>(null);

    const { sendMessage } = useWebsocketService<UserFrontendResponse>({
        eventMap: {
            users: {
                exportOwnDataPercentage: (response) => {
                    if (response.export_id !== exportId.value) {
                        return;
                    }

                    if (processingLoader.running) {
                        processingProgress.value = response.percentage;
                    }
                },
                exportOwnDataFinished: (response) => {
                    if (response.export_id !== exportId.value) {
                        return;
                    }

                    if (processingLoader.running) {
                        processingLoader.stop();
                        exportId.value = response.export_id;
                    }
                },
                exportOwnDataFailed: (response) => {
                    if (response.export_id !== exportId.value) {
                        return;
                    }

                    if (processingLoader.running) {
                        exportId.value = null;
                        processingLoader.stop();
                        addMessage({
                            type: "error",
                            text: response.message,
                        });
                    }
                },
            },
        },
    });

    const handleExportMyData = async () => {
        processingProgress.value = 0;
        confirmExport.value = false;

        try {
            const password = await protectionLock.requestUnlock();

            if (!password) {
                processingLoader.stop();
                addMessage({
                    type: "error",
                    text: "User password is required to export data",
                });
                return;
            }

            const response = await sendMessage<
                ExportOwnDataMessage,
                ExportOwnDataResponse
            >(
                "users",
                "exportOwnData",
                {
                    data: {
                        user_password: password,
                    },
                    expect: "exportOwnDataResponse",
                },
            );

            processingLoader.start();
            exportId.value = response.export_id;
            jobId.value = response.job_id;
        } catch (e) {
            const error = e as SystemErrorMessage;
            addSystemErrorMessage(error);
        }
    };

    const handleAbort = async () => {
        await sendMessage<
            CancelExportOwnDataMessage,
            CancelExportOwnDataResponse
        >("users", "cancelExportOwnData", {
            data: {
                job_id: jobId.value!,
            },
            expect: "cancelExportOwnDataResponse",
        });

        processingLoader.stop();
        exportId.value = null;
    };

    useEffect(() => {
        const handleConfirmBeforeUnload = () => {
            if (processingLoader.running) {
                handleAbort();
            }
        };

        const confirmBeforeRedirect = async () => {
            if (processingLoader.running) {
                await handleAbort();
            }

            return true;
        };

        globalThis.addEventListener("beforeunload", handleConfirmBeforeUnload);
        addBeforeRedirectListener(confirmBeforeRedirect);

        return () => {
            globalThis.removeEventListener(
                "beforeunload",
                handleConfirmBeforeUnload,
            );
            removeBeforeRedirectListener(confirmBeforeRedirect);
        };
    }, [processingLoader.running]);

    return (
        <>
            <div>
                <h1 class="text-xl">Data export</h1>
                <p class="py-4">
                    You create an export of all of your notes and files by by
                    clicking the button below. The export will be a ZIP file
                    containing all of your data.

                    This is a process which may take a few minutes to complete
                    depending on the amount of data you have.
                </p>

                <Button
                    onClick={() => confirmExport.value = true}
                    color="danger"
                >
                    <Icon name="export" /> Export my data
                </Button>
            </div>
            <ConfirmDialog
                prompt="An export file will be generated containing all of your notes and files. Are you sure you want to proceed?"
                onConfirm={handleExportMyData}
                onCancel={() => confirmExport.value = false}
                confirmColor="success"
                visible={confirmExport.value}
            />
            {processingLoader.running && (
                <Dialog
                    visible={true}
                    canCancel={false}
                >
                    <p class="py-4 text-xl">Exporting your data</p>
                    <p>
                        Your data is being exported. This may take a few
                        minutes.
                    </p>
                    <p class="py-4">
                        <div>
                            Progress: {processingProgress.value}%
                        </div>
                        <progress
                            class="w-full"
                            max={100}
                            min="0"
                            value={processingProgress.value}
                        />
                    </p>

                    <div class="py-4">
                        <Button
                            color="danger"
                            onClick={handleAbort}
                        >
                            <Icon name="minus-circle" /> Cancel
                        </Button>
                    </div>
                </Dialog>
            )}
            {!processingLoader.running && exportId.value && (
                <Dialog
                    visible={true}
                    canCancel={false}
                >
                    <div>
                        <p class="py-4 text-xl">
                            Your data has been exported successfully!
                        </p>

                        <div>
                            <strong>Important:</strong>{" "}
                            This is the only place where you can download the
                            generated data. Click on the link below to download
                            your data. This link will expire in 6 hours.
                        </div>

                        <div class="py-4">
                            <Button
                                color="success"
                                addClass="mr-2"
                                onClick={() =>
                                    open(
                                        `/app/profile/download-export-${exportId.value}`,
                                    )}
                            >
                                <Icon name="download" /> Download your data
                            </Button>
                            <Button
                                color="danger"
                                onClick={() => exportId.value = null}
                            >
                                <Icon name="minus-circle" /> Cancel
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </>
    );
}
