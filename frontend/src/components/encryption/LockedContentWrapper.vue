<script setup lang="ts" generic="T extends object">
import { computed, ref, shallowRef, watch } from "vue";
import Button from "@/components/Button.vue";
import Dialog from "@/components/Dialog.vue";
import Loader from "@/components/Loader.vue";
import { useContentEncryption } from "@/composables/useContentEncryption";
import { socketErrorMessage } from "@/lib/error-messages";
import { useProtectionLockStore } from "@/stores/protection-lock";

// Decrypts copies, the input
// records are never changed.
const props = withDefaults(
    defineProps<{
        records: T[];
        protectedKeys: (keyof T)[];
        isLockedKey: keyof T;
        dialogMode?: boolean;
    }>(),
    { dialogMode: false },
);

const emit = defineEmits<{ unlockFail: [reason: string] }>();

defineSlots<{ default(props: { records: T[] }): unknown }>();

const protectionLock = useProtectionLockStore();
const contentEncryption = useContentEncryption();

const unlocked = shallowRef<T[] | null>(null);
const failReason = ref<string | null>(null);
const isUnlocking = ref(false);

const hasProtected = computed(() =>
    props.records.some((record) => record[props.isLockedKey]),
);

// A run started for older records (or before a lock) must not overwrite the
// result of a newer one.
let generation = 0;

const unlock = async () => {
    const current = ++generation;
    unlocked.value = null;
    failReason.value = null;

    if (!hasProtected.value) {
        unlocked.value = props.records.map((record) => ({ ...record }));
        return;
    }

    isUnlocking.value = true;
    try {
        const results: T[] = [];
        for (const record of props.records) {
            const copy = { ...record };
            if (record[props.isLockedKey]) {
                for (const key of props.protectedKeys) {
                    if (copy[key]) {
                        copy[key] = (await contentEncryption.decryptText(
                            copy[key] as string,
                        )) as T[typeof key];
                    }
                }
            }
            results.push(copy);
        }
        if (current === generation) {
            unlocked.value = results;
        }
    } catch (error) {
        if (current === generation) {
            failReason.value = socketErrorMessage(error);
            emit("unlockFail", failReason.value);
        }
    } finally {
        if (current === generation) {
            isUnlocking.value = false;
        }
    }
};

watch(() => props.records, unlock, { immediate: true });

watch(
    () => protectionLock.isLocked,
    (isLocked) => {
        if (!hasProtected.value) {
            return;
        }
        if (isLocked) {
            generation++;
            isUnlocking.value = false;
            unlocked.value = null;
            failReason.value = "Locked by protection lock.";
        } else if (!unlocked.value && !isUnlocking.value) {
            void unlock();
        }
    },
);
</script>

<template>
    <div>
        <slot v-if="unlocked" :records="unlocked" />
        <div v-else-if="failReason && !dialogMode">
            <div class="text-2xl font-semibold py-2">
                Password is required for this area.
            </div>
            <p>
                This area contains password protected content which cannot be
                viewed or edited without entering the password.
            </p>
            <p class="text-lg my-2">
                Could not unlock due to: {{ failReason }}
            </p>
            <Button
                v-if="protectionLock.isLocked"
                color="success"
                @click="unlock"
            >
                Unlock
            </Button>
        </div>
        <template v-else-if="!failReason">
            <Dialog v-if="dialogMode" visible>
                <Loader color="white">Waiting for protection unlock...</Loader>
            </Dialog>
            <Loader v-else color="white">
                Waiting for protection unlock...
            </Loader>
        </template>
    </div>
</template>
