import { JSX } from "preact";
import { useLoader } from "$frontend/hooks/use-loader.ts";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";
import { useContentEncryption } from "$frontend/hooks/use-content-encryption.ts";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface LockedContentWrapperProps<T> {
    inputRecords: T[];
    protectedKeys: (keyof T)[];
    isLockedKey: keyof T;
    unlockRender: (unlockedRecords: T[]) => JSX.Element;
}

export default function LockedContentWrapper<T>({
    inputRecords,
    protectedKeys,
    isLockedKey,
    unlockRender,
}: LockedContentWrapperProps<T>) {
    if (!IS_BROWSER) {
        return null;
    }

    const loader = useLoader(inputRecords.some((r) => r[isLockedKey]));
    const contentEncryption = useContentEncryption();
    const records = useSignal<T[]>([]);

    const unlockRecords = loader.wrap(async (inputRecords: T[]) => {
        const results = [];
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

        records.value = results;
    });

    useEffect(() => {
        if (inputRecords === records.value) {
            return;
        }

        if (inputRecords.some((r) => r[isLockedKey])) {
            unlockRecords(inputRecords);
        } else {
            records.value = [...inputRecords];
        }
    }, [inputRecords]);

    return (
        <div>
            {loader.running || records.value.length === 0
                ? (
                    <Loader color="white">
                        Waiting for protection unlock...
                    </Loader>
                )
                : unlockRender(records.value)}
        </div>
    );
}
