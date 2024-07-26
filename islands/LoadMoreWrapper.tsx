import { ComponentChildren, createRef } from "preact";
import { useLayoutEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";

interface LoadMoreWrapperProps {
    onLoadMore: () => void;
    addCss?: string;
    hasMore: boolean;
    children: ComponentChildren;
}

const option = {
    root: null,
    rootMargin: "20px",
    threshold: 1,
};

export default function LoadMoreWrapper({
    onLoadMore,
    hasMore,
    children,
    addCss = "",
}: LoadMoreWrapperProps) {
    const loadNextRef = createRef<HTMLDivElement>();

    useLayoutEffect(() => {
        const handleObserver: IntersectionObserverCallback = (entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore) {
                onLoadMore();
            }
        };

        const observer = new IntersectionObserver(handleObserver, option);

        if (loadNextRef.current) {
            observer.observe(loadNextRef.current);
        }

        return () => {
            if (loadNextRef.current) {
                observer.disconnect();
            }
        };
    }, [loadNextRef]);

    return (
        <div class={`overflow-auto ${addCss}`}>
            {children}
            {hasMore && (
                <div ref={loadNextRef} class="text-center block h-3">
                    <Loader color="white" />
                </div>
            )}
        </div>
    );
}
