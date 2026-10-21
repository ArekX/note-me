import { onBeforeUnmount, onMounted } from "vue";
import type { NamespaceEventMap } from "@/lib/socket";
import type {
    DataChangedResponse,
    DataEntity,
    Message,
} from "@/types/messages";
import { useSocketStore } from "@/stores/socket";

// Passkeys and MCP clients only change for their own user, so the server
// never sends them in dataChanged.
export type ChangeSource = DataEntity | "passkey" | "mcpClient";

// The user's responses go to every tab; dataChanged covers other users and
// background tasks.
const responses: Record<ChangeSource, Record<string, readonly string[]>> = {
    note: {
        notes: [
            "createNoteResponse",
            "updateNoteResponse",
            "deleteNoteResponse",
            "restoreDeletedNoteResponse",
            "fullyDeleteNoteResponse",
            "revertNoteToHistoryResponse",
        ],
    },
    reminder: { notes: ["setReminderResponse", "removeReminderResponse"] },
    group: {
        groups: [
            "createGroupResponse",
            "updateGroupResponse",
            "deleteGroupResponse",
        ],
    },
    share: {
        notes: [
            "shareToUsersResponse",
            "createPublicShareResponse",
            "removePublicShareResponse",
        ],
    },
    tag: {
        tags: ["createTagResponse", "updateTagResponse", "deleteTagResponse"],
    },
    file: {
        files: [
            "endFileResponse",
            "updateFileResponse",
            "updateMultipleFilesResponse",
            "deleteFileResponse",
        ],
    },
    notification: {
        notifications: [
            "notificationAdded",
            "markedSingleRead",
            "markedAllRead",
            "deletedSingle",
            "deletedAll",
        ],
    },
    user: {
        users: [
            "createUserResponse",
            "updateUserResponse",
            "deleteUserResponse",
            "updateProfileResponse",
        ],
    },
    backup: { settings: ["createBackupNowResponse", "deleteBackupResponse"] },
    backupTarget: {
        settings: [
            "createBackupTargetResponse",
            "updateBackupTargetResponse",
            "deleteBackupTargetResponse",
            "createBackupNowResponse",
        ],
    },
    periodicTask: {},
    aiProvider: {
        ai: [
            "createProviderResponse",
            "updateProviderResponse",
            "deleteProviderResponse",
            "setDefaultProviderResponse",
        ],
    },
    passkey: {
        users: [
            "verifyPasskeyRegistrationResponse",
            "deleteOwnPasskeyResponse",
            "updateOwnPasskeyResponse",
        ],
    },
    mcpClient: {
        users: [
            "createMcpClientResponse",
            "updateMcpClientResponse",
            "deleteMcpClientResponse",
            "regenerateMcpClientSecretResponse",
        ],
    },
};

// Changes come in bursts (a restore also updates the tree, an assistant turn
// changes several notes), so a list reloads once per burst.
export const RELOAD_DELAY_MS = 100;

export interface DataChangesOptions {
    // false: only dataChanged, for lists of other users' data such as notes
    // shared with this user.
    responses?: boolean;
    // For lists that reload themselves after their own actions.
    skipOwnRequests?: boolean;
    // Narrows dataChanged to the ids this view shows.
    matches?: (ids: Array<number | string>) => boolean;
}

// A change while the browser tab is hidden only marks the list stale; it
// reloads once the tab is shown again.
export const useDataChanges = (
    sources: readonly ChangeSource[],
    reload: () => unknown,
    options: DataChangesOptions = {},
) => {
    const socketStore = useSocketStore();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stale = false;
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const run = () => {
        timer = null;
        if (document.visibilityState === "hidden") {
            stale = true;
            return;
        }
        void reload();
    };

    const schedule = () => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(run, RELOAD_DELAY_MS);
    };

    const onVisibilityChange = () => {
        if (stale && document.visibilityState === "visible") {
            stale = false;
            void reload();
        }
    };

    onMounted(async () => {
        document.addEventListener("visibilitychange", onVisibilityChange);
        const service = await socketStore.getService();
        if (!mounted) {
            return;
        }

        const eventMap: Record<string, Record<string, (m: Message) => void>> = {
            changes: {
                dataChanged: (message) => {
                    const { entity, ids } = message as DataChangedResponse;
                    if (
                        sources.includes(entity) &&
                        (options.matches?.(ids) ?? true)
                    ) {
                        schedule();
                    }
                },
            },
        };
        if (options.responses ?? true) {
            const onResponse = (message: Message) => {
                if (
                    !options.skipOwnRequests ||
                    !service.isOwnRequest(message.requestId)
                ) {
                    schedule();
                }
            };
            for (const source of sources) {
                for (const [namespace, types] of Object.entries(
                    responses[source],
                )) {
                    for (const type of types) {
                        (eventMap[namespace] ??= {})[type] = onResponse;
                    }
                }
            }
        }
        unsubscribe = service.listen(eventMap as NamespaceEventMap);
    });

    onBeforeUnmount(() => {
        mounted = false;
        document.removeEventListener("visibilitychange", onVisibilityChange);
        unsubscribe?.();
        if (timer) {
            clearTimeout(timer);
        }
    });
};
