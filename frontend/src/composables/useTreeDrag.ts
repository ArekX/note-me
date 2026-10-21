import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from "vue";
import { Draggable } from "@shopify/draggable";
import { ROOT_KEY, useTreeStore } from "@/stores/tree";

const sourceKey = ref<string | null>(null);
const targetKey = ref<string | null>(null);
let stoppedAt = 0;

export const treeDragState = {
    sourceKey: readonly(sourceKey),
    targetKey: readonly(targetKey),
};

// After a drop the browser still fires a click on the common ancestor of the
// press and release targets, which would toggle that group.
export const isDragJustFinished = () => performance.now() - stoppedAt < 300;

const keyOf = (element: HTMLElement | null | undefined) =>
    element?.dataset.treeKey ?? null;

// Items carry data-tree-key and
// only rows with data-drag-handle can be picked up; a note resolves to its
// group as a drop target and the top level bar to the root.
export const useTreeDrag = (
    tree: Ref<HTMLElement | null>,
    topLevel: Ref<HTMLElement | null>,
) => {
    const store = useTreeStore();
    let draggable: Draggable | null = null;

    const setTarget = (key: string | null) => {
        targetKey.value =
            key && sourceKey.value && store.canDropTo(sourceKey.value, key)
                ? key
                : null;
    };

    onMounted(() => {
        if (!tree.value || !topLevel.value) {
            return;
        }

        draggable = new Draggable([tree.value, topLevel.value], {
            draggable: "[data-tree-key]",
            handle: "[data-drag-handle]",
            distance: 8,
            mirror: { appendTo: "body", constrainDimensions: true },
        });

        draggable.on("drag:start", (event) => {
            const key = keyOf(event.originalSource);
            const type = key ? store.nodes[key]?.type : undefined;
            if (type !== "group" && type !== "note") {
                event.cancel();
                return;
            }
            sourceKey.value = key;
        });

        draggable.on("mirror:created", ({ mirror }) => {
            mirror.querySelector(".group-item-children")?.remove();
        });

        draggable.on("drag:over", ({ over }) => {
            const key = keyOf(over);
            const node = key ? store.nodes[key] : undefined;
            setTarget(node?.type === "note" ? node.parent : key);
        });

        draggable.on("drag:out", () => setTarget(null));

        draggable.on("drag:over:container", ({ overContainer }) => {
            if (overContainer === topLevel.value) {
                setTarget(ROOT_KEY);
            }
        });

        draggable.on("drag:out:container", ({ overContainer }) => {
            if (overContainer === topLevel.value) {
                setTarget(null);
            }
        });

        draggable.on("drag:stop", () => {
            const source = sourceKey.value;
            const target = targetKey.value;
            sourceKey.value = null;
            targetKey.value = null;
            stoppedAt = performance.now();

            if (source && target) {
                void store.dropItem(source, target);
            }
        });
    });

    onBeforeUnmount(() => {
        draggable?.destroy();
        draggable = null;
    });
};
