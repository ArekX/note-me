import { JSX } from "preact";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";
import { useContentEncryption } from "$frontend/hooks/use-content-encryption.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";
import Dialog from "$islands/Dialog.tsx";
import { useProtectionLock } from "$frontend/hooks/use-protection-lock.ts";
import Button from "$components/Button.tsx";
import {
    consumePropagationTicket,
    createPropagationTicket,
} from "$frontend/propagation-manager.ts";

interface LockedContentWrapperProps<T extends object> {
    inputRecords: T[];
    protectedKeys: (keyof T)[];
    isLockedKey: keyof T;
    unlockRender: (props: { unlockedRecords: T[] }) => JSX.Element;
    dialogMode?: boolean;
    onUnlockFail?: (reason: string) => void;
}

interface ProtectionLoaderProps {
    isDialogMode: boolean;
}
const ProtectionLoader = ({ isDialogMode }: ProtectionLoaderProps) => {
    const loader = (
        <Loader color="white">
            Waiting for protection unlock...
        </Loader>
    );

    if (isDialogMode) {
        return (
            <Dialog visible={true}>
                {loader}
            </Dialog>
        );
    }

    return loader;
};

export default function LockedContentWrapper<T extends object>({
    inputRecords,
    protectedKeys,
    isLockedKey,
    dialogMode,
    unlockRender: UnlockedRenderComponent,
    onUnlockFail,
}: LockedContentWrapperProps<T>) {
    if (!IS_BROWSER) {
        return null;
    }

    const hasProtectedInputRecords = () => {
        for (const record of inputRecords) {
            if (record?.[isLockedKey]) {
                return true;
            }
        }

        return false;
    };

    const loader = useLoader(hasProtectedInputRecords());
    const contentEncryption = useContentEncryption();
    const protectionLock = useProtectionLock();
    const recordsUnlocked = useSignal<boolean>(
        !hasProtectedInputRecords(),
    );
    const failReason = useSignal<string | null>(null);
    const records = useSignal<T[]>(
        hasProtectedInputRecords() ? [] : [...inputRecords],
    );

    const unlockRecords = async (inputRecords: T[]) => {
        loader.start();
        const propagationTicket = createPropagationTicket();
        const results = [];

        try {
            for (const record of inputRecords) {
                if (!record[isLockedKey]) {
                    results.push(record);
                    continue;
                }

                for (const key of protectedKeys) {
                    if (record[key]) {
                        record[key] = (await contentEncryption.decryptText(
                            record[key] as string,
                        ) ?? "") as T[
                            typeof key
                        ];
                    }
                }

                results.push(record);
            }
        } catch (e: unknown) {
            failReason.value = typeof e === "string"
                ? e
                : ((e as Error).message ??
                    "Unknown error or data could not be decrypted.");
            onUnlockFail?.(failReason.value ?? "Unknown error.");
            return;
        } finally {
            await consumePropagationTicket(propagationTicket);
        }

        recordsUnlocked.value = true;
        records.value = results;
        loader.stop();
    };

    useEffect(() => {
        if (!inputRecords.some((r) => !records.value.includes(r))) {
            return;
        }

        failReason.value = null;

        if (hasProtectedInputRecords()) {
            recordsUnlocked.value = false;
            unlockRecords(inputRecords);
        } else {
            recordsUnlocked.value = true;
            records.value = [...inputRecords];
            loader.stop();
        }
    }, [inputRecords]);

    useEffect(() => {
        if (
            hasProtectedInputRecords() && protectionLock.isLocked.value &&
            !loader.running
        ) {
            loader.start();
            failReason.value = "Locked by protection lock.";
        } else {
            loader.stop();

            if (!recordsUnlocked.value) {
                unlockRecords(records.value);
            }
        }
    }, [protectionLock.isLocked.value]);

    return (
        <div>
            {loader.running || records.value.length === 0
                ? (
                    <div>
                        {!failReason.value && (
                            <ProtectionLoader
                                isDialogMode={dialogMode ?? false}
                            />
                        )}
                        {!dialogMode && failReason.value && (
                            <div>
                                <div class="text-2xl font-semibold py-2">
                                    Password is required for this area.
                                </div>

                                <p>
                                    This area contains password protected
                                    content which cannot be viewed or edited
                                    without entering the password.
                                </p>

                                <p class="text-lg my-2">
                                    Could not unlock due to: {failReason.value}
                                </p>

                                {protectionLock.isLocked.value && (
                                    <Button
                                        color="success"
                                        onClick={() =>
                                            unlockRecords(inputRecords)}
                                    >
                                        Unlock
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )
                : <UnlockedRenderComponent unlockedRecords={records.value} />}
        </div>
    );
}
