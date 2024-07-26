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

interface LockedContentWrapperProps<T> {
    inputRecords: T[];
    protectedKeys: (keyof T)[];
    isLockedKey: keyof T;
    unlockRender: (unlockedRecords: T[]) => JSX.Element;
    dialogMode?: boolean;
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

export default function LockedContentWrapper<T>({
    inputRecords,
    protectedKeys,
    isLockedKey,
    dialogMode,
    unlockRender,
}: LockedContentWrapperProps<T>) {
    if (!IS_BROWSER) {
        return null;
    }

    const loader = useLoader(inputRecords.some((r) => r[isLockedKey]));
    const contentEncryption = useContentEncryption();
    const protectionLock = useProtectionLock();
    const recordsUnlocked = useSignal<boolean>(
        !inputRecords.some((r) => r[isLockedKey]),
    );
    const failReason = useSignal<string | null>(null);
    const records = useSignal<T[]>([]);

    const unlockRecords = async (inputRecords: T[]) => {
        loader.start();
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
        } catch (e) {
            failReason.value = typeof e === "string"
                ? e
                : (e.message ?? "Unknown error");
            return;
        }

        recordsUnlocked.value = true;
        records.value = results;
        loader.stop();
    };

    useEffect(() => {
        if (inputRecords === records.value) {
            return;
        }

        failReason.value = null;

        if (inputRecords.some((r) => r[isLockedKey])) {
            recordsUnlocked.value = false;
            unlockRecords(inputRecords);
        } else {
            recordsUnlocked.value = true;
            records.value = [...inputRecords];
            loader.stop();
        }
    }, [inputRecords]);

    useEffect(() => {
        if (!inputRecords.some((r) => r[isLockedKey])) {
            return;
        }

        if (protectionLock.isLocked() && !loader.running) {
            loader.start();
            failReason.value = "Locked by protection lock.";
        } else {
            loader.stop();

            if (!recordsUnlocked.value) {
                unlockRecords(records.value);
            }
        }
    }, [protectionLock.isLocked()]);

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
                        {failReason.value && (
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
                                    Lock reason: {failReason.value}
                                </p>

                                <Button
                                    color="success"
                                    onClick={() => unlockRecords(inputRecords)}
                                >
                                    Unlock
                                </Button>
                            </div>
                        )}
                    </div>
                )
                : unlockRender(records.value)}
        </div>
    );
}
