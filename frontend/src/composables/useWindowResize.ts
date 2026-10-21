import { onBeforeUnmount, onMounted } from "vue";

export const useWindowResize = (
    onResized: (width: number, height: number) => void,
) => {
    const handleResize = () => onResized(innerWidth, innerHeight);

    onMounted(() => addEventListener("resize", handleResize));
    onBeforeUnmount(() => removeEventListener("resize", handleResize));
};
