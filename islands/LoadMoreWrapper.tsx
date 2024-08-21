import { ComponentChildren, createRef } from "preact";
import { useLayoutEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";
import { useSignal } from "@preact/signals";

interface LoadMoreWrapperProps {
    onLoadMore: () => void;
    addCss?: string;
    hasMore: boolean;
    children: ComponentChildren;
}

const option = {
    root: null,
    threshold: .9,
};

export default function LoadMoreWrapper({
    onLoadMore,
    hasMore,
    children,
    addCss = "",
}: LoadMoreWrapperProps) {
    const loadNextRef = createRef<HTMLDivElement>();
    const timeoutId = useSignal<number | null>(null);

    useLayoutEffect(() => {
        const handleObserver: IntersectionObserverCallback = (entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore && !timeoutId.value) {
                onLoadMore();
            }
        };

        const observer = new IntersectionObserver(handleObserver, option);

        if (timeoutId.value) {
            clearTimeout(timeoutId.value);
        }

        timeoutId.value = setTimeout(() => {
            if (loadNextRef.current) {
                observer.observe(loadNextRef.current);
            }
            timeoutId.value = null;
        }, 1000);

        return () => {
            observer.disconnect();

            if (timeoutId.value) {
                clearTimeout(timeoutId.value);
                timeoutId.value = null;
            }
        };
    }, [loadNextRef.current]);

    return (
        <div class={`${addCss}`}>
            {children}
            {hasMore && (
                <div
                    ref={loadNextRef}
                    class="text-center flex items-center justify-center h-32"
                >
                    <Loader color="white" />
                </div>
            )}
        </div>
    );
}
