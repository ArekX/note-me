import { ref } from "vue";
import { defineStore } from "pinia";
import { socketErrorMessage } from "@/lib/error-messages";
import { useProtectionLockStore } from "./protection-lock";
import { useSocketStore } from "./socket";
import { useToastStore } from "./toast";
import type {
    CancelExportOwnDataMessage,
    CancelExportOwnDataResponse,
    ExportOwnDataFailed,
    ExportOwnDataFinished,
    ExportOwnDataMessage,
    ExportOwnDataPercentageUpdate,
    ExportOwnDataResponse,
    UserFrontendResponse,
} from "@/types/messages";

type ExportEvent =
    ExportOwnDataPercentageUpdate | ExportOwnDataFinished | ExportOwnDataFailed;

export type ExportStartResult =
    | { status: "started" | "declined" | "busy" }
    | { status: "failed"; message: string };

// The Export my data button and the assistant's export_my_data tool share
// this flow; its dialogs live in the app layout (decision 0.90).
export const useDataExportStore = defineStore("data-export", () => {
    const toastStore = useToastStore();

    const isConfirmVisible = ref(false);
    const isProcessing = ref(false);
    const progress = ref(0);
    const exportId = ref<string | null>(null);
    const jobId = ref<string | null>(null);

    let answerConfirm: ((confirmed: boolean) => void) | null = null;

    // A small export can finish before exportOwnDataResponse names its id, so
    // events for ids not known yet wait here.
    const early = new Map<string, ExportEvent[]>();
    let run = 0;

    const applyEvent = (event: ExportEvent) => {
        if (!isProcessing.value) {
            return;
        }
        switch (event.type) {
            case "exportOwnDataPercentage":
                progress.value = event.percentage;
                break;
            case "exportOwnDataFinished":
                isProcessing.value = false;
                break;
            case "exportOwnDataFailed":
                isProcessing.value = false;
                exportId.value = null;
                toastStore.addMessage({ type: "error", text: event.message });
                break;
        }
    };

    const receive = (event: ExportEvent) => {
        if (event.export_id === exportId.value) {
            applyEvent(event);
        } else if (isProcessing.value && exportId.value === null) {
            early.set(event.export_id, [
                ...(early.get(event.export_id) ?? []),
                event,
            ]);
        }
    };

    let listening: Promise<void> | null = null;
    const listen = async () => {
        (await useSocketStore().getService()).listen<UserFrontendResponse>({
            users: {
                exportOwnDataPercentage: receive,
                exportOwnDataFinished: receive,
                exportOwnDataFailed: receive,
            },
        });
    };
    // The socket manager outlives a logout, so the listener is added once.
    const init = () => (listening ??= listen());

    const sendCancel = async (id: string) => {
        try {
            await (
                await useSocketStore().getService()
            ).sendMessage<
                CancelExportOwnDataMessage,
                CancelExportOwnDataResponse
            >("users", "cancelExportOwnData", {
                data: { job_id: id },
                expect: "cancelExportOwnDataResponse",
            });
        } catch (error) {
            toastStore.reportError(error);
        }
    };

    const start = async (): Promise<ExportStartResult> => {
        progress.value = 0;

        let password: string;
        try {
            password = await useProtectionLockStore().requestUnlock();
        } catch {
            toastStore.addMessage({
                type: "error",
                text: "User password is required to export data",
            });
            return { status: "declined" };
        }

        const current = ++run;
        isProcessing.value = true;
        exportId.value = null;
        early.clear();
        try {
            const response = await (
                await useSocketStore().getService()
            ).sendMessage<ExportOwnDataMessage, ExportOwnDataResponse>(
                "users",
                "exportOwnData",
                {
                    data: { user_password: password },
                    expect: "exportOwnDataResponse",
                },
            );
            if (current !== run) {
                await sendCancel(response.job_id);
                return { status: "declined" };
            }
            exportId.value = response.export_id;
            jobId.value = response.job_id;
            for (const event of early.get(response.export_id) ?? []) {
                applyEvent(event);
            }
            early.clear();
            return { status: "started" };
        } catch (error) {
            if (current !== run) {
                return { status: "declined" };
            }
            isProcessing.value = false;
            toastStore.reportError(error);
            return { status: "failed", message: socketErrorMessage(error) };
        }
    };

    // Asks for confirmation first, as the button always did.
    const request = async (): Promise<ExportStartResult> => {
        if (isProcessing.value || isConfirmVisible.value) {
            return { status: "busy" };
        }
        isConfirmVisible.value = true;
        const confirmed = await new Promise<boolean>((resolve) => {
            answerConfirm = resolve;
        });
        return confirmed ? start() : { status: "declined" };
    };

    const answer = (confirmed: boolean) => {
        isConfirmVisible.value = false;
        answerConfirm?.(confirmed);
        answerConfirm = null;
    };

    // A cancel before exportOwnDataResponse arrives moves run on, and the job
    // is cancelled once its id is known.
    const cancel = async () => {
        const id = jobId.value;
        run++;
        isProcessing.value = false;
        exportId.value = null;
        jobId.value = null;
        if (id) {
            await sendCancel(id);
        }
    };

    const download = () => {
        window.open(`/api/data-export/${exportId.value}`);
    };

    const dismiss = () => {
        exportId.value = null;
    };

    return {
        isConfirmVisible,
        isProcessing,
        progress,
        exportId,
        init,
        request,
        answer,
        cancel,
        download,
        dismiss,
    };
});
