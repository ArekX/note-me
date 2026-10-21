import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    toValue,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";

const currentId = ref<string | null>(null);

export const closeAllPopovers = () => {
    currentId.value = null;
};

export const isPopoverOpen = (id: string) => currentId.value === id;

export const useSinglePopover = (
    id: MaybeRefOrGetter<string>,
    menuRef: Ref<HTMLElement | null>,
) => {
    const isOpen = computed(() => currentId.value === toValue(id));

    const open = () => {
        currentId.value = toValue(id);
    };

    const close = () => {
        if (isOpen.value) {
            currentId.value = null;
        }
    };

    const handleOutsideClick = (event: Event) => {
        if (isOpen.value && !menuRef.value?.contains(event.target as Node)) {
            close();
        }
    };

    onMounted(() =>
        document.body.addEventListener("click", handleOutsideClick),
    );
    onBeforeUnmount(() => {
        document.body.removeEventListener("click", handleOutsideClick);
        close();
    });

    return { isOpen, open, close };
};
